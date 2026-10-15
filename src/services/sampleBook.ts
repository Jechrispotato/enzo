import JSZip from 'jszip';
import { importBookFile } from './bookImporter';
import type { Book } from '../types';

export async function createAndImportSampleEpub(): Promise<Book | undefined> {
  const zip = new JSZip();

  // Create standard EPUB container
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>On the Pleasure of Reading</dc:title>
    <dc:creator>William Hazlitt</dc:creator>
    <dc:language>en</dc:language>
    <dc:description>A timeless reflection on the intimacy of books, memory, and the quiet sanctuary of the personal library.</dc:description>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', opfXml);

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <h1>Contents</h1>
    <ol>
      <li><a href="chapter1.xhtml">I. The Sanctity of Old Pages</a></li>
      <li><a href="chapter2.xhtml">II. Time, Memory, and Solitude</a></li>
      <li><a href="chapter3.xhtml">III. The Quiet Companionship of Words</a></li>
    </ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml);

  const chapter1Xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>I. The Sanctity of Old Pages</title></head>
<body>
  <h1>I. The Sanctity of Old Pages</h1>
  <p>I hate to read new books. There are twenty or thirty volumes that I have read over and over again, and fancy they have paid for the trouble: other persons may read them for the first time, and I envy them the pleasure.</p>
  <p>In reading a book which is an old favorite with me (say the first novel I ever read), I not only have the pleasure of imagination and of a critical relish of the work, but the old associations rush in on the brain; I consult the marks in the margin, and read the book over again with twenty times more pleasure than the first time.</p>
  <blockquote>
    <p>“To read an old favorite is to walk once more in gardens where every leaf has known our shadow, and every breeze carries the echo of our earliest thoughts.”</p>
  </blockquote>
  <p>The book itself becomes a repository of our former selves; we look into its pages as into a glass of antique crystal, reflecting the face of an earlier, more generous season of life.</p>
</body>
</html>`;
  zip.file('OEBPS/chapter1.xhtml', chapter1Xhtml);

  const chapter2Xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>II. Time, Memory, and Solitude</title></head>
<body>
  <h1>II. Time, Memory, and Solitude</h1>
  <p>When I take up a work that I have read before (the longer ago, the better), it seems to me like a companion that I have met with after a long absence.</p>
  <p>The time between passes away, and I am once more that solitary boy who sat upon the bench under the beech trees, while the shadows lengthened across the lawn. We do not mourn for what is lost; rather, the printed sentence gathers all our vanished years into a single, quiet hour.</p>
  <p>The true reader does not devour books to escape life, but to deepen it. In quietness, we find that every sentence has a heartbeat of its own.</p>
</body>
</html>`;
  zip.file('OEBPS/chapter2.xhtml', chapter2Xhtml);

  const chapter3Xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>III. The Quiet Companionship of Words</title></head>
<body>
  <h1>III. The Quiet Companionship of Words</h1>
  <p>Books are the truest friends, because they demand nothing, impose nothing, and wait patiently upon our pleasure.</p>
  <p>They ask no introduction, they bear no grievances, and when we close them, they harbor no sorrow. In a world of fleeting haste and constant clamor, a quiet page remains an unbroken sanctuary.</p>
  <blockquote>
    <p>“He that loveth a book will never want a faithful friend, a wholesome counselor, a cheerful companion, an effectual comforter.”</p>
  </blockquote>
  <p>Let us therefore keep our library small, beautiful, and deeply known.</p>
</body>
</html>`;
  zip.file('OEBPS/chapter3.xhtml', chapter3Xhtml);

  const epubBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const result = await importBookFile({ blob: epubBlob, name: 'On the Pleasure of Reading — William Hazlitt.epub' });

  if (result.success && result.book) {
    return result.book;
  }
  return undefined;
}
