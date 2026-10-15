import JSZip from 'jszip';
import type { TocItem } from '../../types';

export interface ParsedEpub {
  metadata: {
    title: string;
    author: string;
    language?: string;
    description?: string;
    coverUrl?: string;
  };
  spine: Array<{
    id: string;
    href: string;
    title?: string;
  }>;
  toc: TocItem[];
  loadChapter: (href: string) => Promise<{ html: string; title: string }>;
  cleanup: () => void;
}

// Clean text helper
function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

// Resolve relative paths in ZIP
function resolveZipPath(basePath: string, relativePath: string): string {
  // Strip anchor if any
  const cleanRelative = relativePath.split('#')[0];
  if (!cleanRelative) return basePath;

  if (cleanRelative.startsWith('/')) {
    return cleanRelative.slice(1);
  }

  const baseParts = basePath.split('/');
  baseParts.pop(); // remove filename

  const relParts = cleanRelative.split('/');
  for (const part of relParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  return baseParts.join('/');
}

// Extract base64 image from zip
async function extractImageAsDataUrl(zip: JSZip, imagePath: string): Promise<string | undefined> {
  // Try exact path or case-insensitive search
  let file = zip.file(imagePath);
  if (!file) {
    const lower = imagePath.toLowerCase();
    const foundKey = Object.keys(zip.files).find((k) => k.toLowerCase() === lower);
    if (foundKey) {
      file = zip.file(foundKey);
    }
  }

  if (!file) return undefined;

  try {
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
    const base64 = await file.async('base64');
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn('Failed to extract image as data URL', err);
    return undefined;
  }
}

export async function parseEpubFile(fileBlob: Blob): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(fileBlob);
  const domParser = new DOMParser();

  // 1. Read META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml') || zip.file('meta-inf/container.xml');
  if (!containerFile) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found');
  }

  const containerXmlStr = await containerFile.async('text');
  const containerDoc = domParser.parseFromString(containerXmlStr, 'application/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Invalid EPUB: OPF rootfile path not found in container.xml');
  }

  // 2. Read OPF
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid EPUB: Package file ${opfPath} not found`);
  }

  const opfXmlStr = await opfFile.async('text');
  const opfDoc = domParser.parseFromString(opfXmlStr, 'application/xml');

  // Extract Metadata
  const getMeta = (tagName: string): string => {
    // Try both with and without namespace
    const el = opfDoc.getElementsByTagName(tagName)[0] || 
               opfDoc.getElementsByTagName(`dc:${tagName}`)[0] ||
               opfDoc.querySelector(tagName);
    return cleanText(el?.textContent);
  };

  const title = getMeta('title') || 'Untitled Book';
  const author = getMeta('creator') || 'Unknown Author';
  const language = getMeta('language') || 'en';
  const description = getMeta('description') || '';

  // Manifest items map: id -> { href, mediaType, properties }
  const manifestItems: Record<string, { href: string; mediaType: string; properties?: string }> = {};
  const itemEls = opfDoc.querySelectorAll('manifest > item');
  itemEls.forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    const properties = item.getAttribute('properties') || '';
    if (id && href && mediaType) {
      manifestItems[id] = { href, mediaType, properties };
    }
  });

  // Extract Cover Image
  let coverPath: string | undefined;

  // Method A: meta[name="cover"]
  const coverMeta = opfDoc.querySelector('metadata > meta[name="cover"]');
  if (coverMeta) {
    const coverId = coverMeta.getAttribute('content');
    if (coverId && manifestItems[coverId]) {
      coverPath = resolveZipPath(opfPath, manifestItems[coverId].href);
    }
  }

  // Method B: item with properties="cover-image"
  if (!coverPath) {
    const coverItem = Object.values(manifestItems).find(
      (it) => it.properties?.includes('cover-image') || it.href.toLowerCase().includes('cover') && it.mediaType.startsWith('image/')
    );
    if (coverItem) {
      coverPath = resolveZipPath(opfPath, coverItem.href);
    }
  }

  let coverUrl: string | undefined;
  if (coverPath) {
    coverUrl = await extractImageAsDataUrl(zip, coverPath);
  }

  // 3. Extract Spine (ordered chapters)
  const spineItems: Array<{ id: string; href: string; title?: string }> = [];
  const itemrefEls = opfDoc.querySelectorAll('spine > itemref');
  itemrefEls.forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    if (idref && manifestItems[idref]) {
      const fullHref = resolveZipPath(opfPath, manifestItems[idref].href);
      spineItems.push({
        id: idref,
        href: fullHref,
      });
    }
  });

  // 4. Extract Table of Contents
  const toc: TocItem[] = [];

  // Try finding NCX file
  const spineEl = opfDoc.querySelector('spine');
  const ncxId = spineEl?.getAttribute('toc');
  let ncxPath = ncxId && manifestItems[ncxId] ? resolveZipPath(opfPath, manifestItems[ncxId].href) : undefined;

  if (!ncxPath) {
    // Look for any item with media-type="application/x-dtbncx+xml"
    const foundNcx = Object.values(manifestItems).find((it) => it.mediaType.includes('ncx'));
    if (foundNcx) {
      ncxPath = resolveZipPath(opfPath, foundNcx.href);
    }
  }

  if (ncxPath && zip.file(ncxPath)) {
    try {
      const ncxXmlStr = await zip.file(ncxPath)!.async('text');
      const ncxDoc = domParser.parseFromString(ncxXmlStr, 'application/xml');
      const navPoints = ncxDoc.querySelectorAll('navMap > navPoint');

      navPoints.forEach((np) => {
        const textEl = np.querySelector('navLabel > text');
        const contentEl = np.querySelector('content');
        const navTitle = cleanText(textEl?.textContent);
        const navSrc = contentEl?.getAttribute('src');

        if (navTitle && navSrc) {
          const resolvedHref = resolveZipPath(ncxPath!, navSrc);
          toc.push({
            title: navTitle,
            href: resolvedHref,
          });
        }
      });
    } catch (e) {
      console.warn('Error parsing NCX TOC', e);
    }
  }

  // Try EPUB 3 Nav Document if TOC still empty
  if (toc.length === 0) {
    const navItem = Object.values(manifestItems).find(
      (it) => it.properties?.includes('nav') || it.href.toLowerCase().includes('nav')
    );
    if (navItem) {
      try {
        const navFullPath = resolveZipPath(opfPath, navItem.href);
        const navFile = zip.file(navFullPath);
        if (navFile) {
          const navHtml = await navFile.async('text');
          const navDoc = domParser.parseFromString(navHtml, 'text/html');
          const links = navDoc.querySelectorAll('nav[epub\\:type="toc"] a, nav#toc a, nav.toc a');
          links.forEach((a) => {
            const aTitle = cleanText(a.textContent);
            const aHref = a.getAttribute('href');
            if (aTitle && aHref) {
              toc.push({
                title: aTitle,
                href: resolveZipPath(navFullPath, aHref),
              });
            }
          });
        }
      } catch (e) {
        console.warn('Error parsing EPUB 3 Nav document', e);
      }
    }
  }

  // Fallback TOC: if still empty, generate from spine chapters
  if (toc.length === 0) {
    spineItems.forEach((sp, idx) => {
      toc.push({
        title: `Chapter ${idx + 1}`,
        href: sp.href,
      });
    });
  }

  // Map TOC titles back to spine items when matching href
  spineItems.forEach((sp, index) => {
    const matchedToc = toc.find((t) => t.href.split('#')[0] === sp.href.split('#')[0]);
    sp.title = matchedToc?.title || `Section ${index + 1}`;
  });

  const objectUrlsCreated: string[] = [];

  // Function to load and render a specific chapter
  const loadChapter = async (chapterHref: string): Promise<{ html: string; title: string }> => {
    const cleanHref = chapterHref.split('#')[0];
    const chapterFile = zip.file(cleanHref);

    if (!chapterFile) {
      throw new Error(`Chapter file ${cleanHref} not found in EPUB`);
    }

    const rawHtml = await chapterFile.async('text');
    const doc = domParser.parseFromString(rawHtml, 'text/html');

    // Extract title from <h1>, <title>, or spine
    const chapterHeading = cleanText(doc.querySelector('h1, h2, title')?.textContent);
    const matchedSpine = spineItems.find((s) => s.href.split('#')[0] === cleanHref);
    const title = chapterHeading || matchedSpine?.title || 'Chapter';

    // Remove scripts, objects, embeds, iframes for security
    doc.querySelectorAll('script, style, iframe, object, embed, link[rel="stylesheet"]').forEach((el) => el.remove());

    // Resolve relative images in chapter
    const imgEls = doc.querySelectorAll('img, image');
    for (const img of Array.from(imgEls)) {
      const srcAttr = img.tagName.toLowerCase() === 'image' ? 'xlink:href' : 'src';
      const rawSrc = img.getAttribute(srcAttr) || img.getAttribute('src');
      if (rawSrc && !rawSrc.startsWith('data:') && !rawSrc.startsWith('http')) {
        const imageResolvedPath = resolveZipPath(cleanHref, rawSrc);
        const dataUrl = await extractImageAsDataUrl(zip, imageResolvedPath);
        if (dataUrl) {
          img.setAttribute('src', dataUrl);
          img.removeAttribute('srcset');
        } else {
          img.remove();
        }
      }
    }

    // Clean internal links: keep hash or chapter references safe
    doc.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href) {
        if (href.startsWith('#')) {
          // Internal anchor link in same chapter
          a.setAttribute('data-internal-anchor', href.slice(1));
          a.removeAttribute('href');
        } else if (href.startsWith('http')) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        } else {
          const targetResolved = resolveZipPath(cleanHref, href);
          a.setAttribute('data-chapter-target', targetResolved);
          a.removeAttribute('href');
        }
      }
    });

    const bodyHtml = doc.body ? doc.body.innerHTML : rawHtml;

    return {
      html: bodyHtml,
      title,
    };
  };

  const cleanup = () => {
    for (const url of objectUrlsCreated) {
      URL.revokeObjectURL(url);
    }
  };

  return {
    metadata: {
      title,
      author,
      language,
      description,
      coverUrl,
    },
    spine: spineItems,
    toc,
    loadChapter,
    cleanup,
  };
}
