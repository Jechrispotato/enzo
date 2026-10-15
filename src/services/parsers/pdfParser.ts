import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker in Vite
if (typeof window !== 'undefined') {
  // Use worker from unpkg or local worker if available, fallback to workerSrc
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    console.warn('Could not load local pdf worker, falling back to CDN worker', e);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export interface ParsedPdf {
  title: string;
  author: string;
  numPages: number;
  coverUrl?: string;
}

export async function parsePdfMetadata(fileBlob: Blob, fallbackTitle: string): Promise<ParsedPdf> {
  const arrayBuffer = await fileBlob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let title = fallbackTitle;
  let author = 'Unknown Author';

  try {
    const meta = await pdfDoc.getMetadata();
    const info = meta.info as any;
    if (info?.Title && typeof info.Title === 'string' && info.Title.trim().length > 0) {
      title = info.Title.trim();
    }
    if (info?.Author && typeof info.Author === 'string' && info.Author.trim().length > 0) {
      author = info.Author.trim();
    }
  } catch (e) {
    console.warn('Could not read PDF metadata', e);
  }

  // Generate cover thumbnail from Page 1
  let coverUrl: string | undefined;
  try {
    const page1 = await pdfDoc.getPage(1);
    const viewport = page1.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page1.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as any).promise;
      coverUrl = canvas.toDataURL('image/jpeg', 0.8);
    }
  } catch (e) {
    console.warn('Could not generate PDF cover thumbnail', e);
  }

  return {
    title,
    author,
    numPages: pdfDoc.numPages,
    coverUrl,
  };
}

export async function loadPdfDocument(fileBlob: Blob) {
  const arrayBuffer = await fileBlob.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}
