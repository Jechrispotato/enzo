export interface ParsedTxt {
  title: string;
  author: string;
  wordCount: number;
  readingTimeMinutes: number;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export async function parseTxtFile(fileBlob: Blob, fallbackTitle: string): Promise<ParsedTxt> {
  const text = await fileBlob.text();
  const lines = text.split(/\r?\n/);

  let title = fallbackTitle.replace(/\.(txt|md)$/i, '');
  let author = 'Unknown Author';

  // Look for title and author in first 10 lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for markdown heading # Title
    if (line.startsWith('# ')) {
      title = line.replace(/^#+\s*/, '').trim();
    } else if (/^(by|author):\s*/i.test(line)) {
      author = line.replace(/^(by|author):\s*/i, '').trim();
    }
  }

  // Count words
  const words = text.match(/\b\w+\b/g) || [];
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 220));

  // Detect section / chapter breaks
  // E.g., lines matching "Chapter X", "Act X", "# Heading", or separated by "---" / "***"
  const rawSections: Array<{ title: string; lines: string[] }> = [];
  let currentTitle = 'Beginning';
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line looks like a chapter/section heading
    const isHeading = 
      /^(chapter|book|section|part|act)\s+[0-9ivxlcdm]+/i.test(trimmed) ||
      /^#{1,3}\s+[a-zA-Z0-9]/.test(trimmed) ||
      (trimmed.length > 2 && trimmed.length < 50 && /^[A-Z0-9\s:,'"-]+$/.test(trimmed) && lines[i-1]?.trim() === '' && lines[i+1]?.trim() === '');

    if (isHeading && currentLines.length > 0) {
      rawSections.push({
        title: currentTitle,
        lines: currentLines,
      });
      currentTitle = trimmed.replace(/^#+\s*/, '');
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    rawSections.push({
      title: currentTitle,
      lines: currentLines,
    });
  }

  // If no sections were detected or only 1, break every ~1500 words or keep as single section
  const sections = rawSections.map((s) => ({
    title: s.title,
    content: s.lines.join('\n').trim(),
  })).filter((s) => s.content.length > 0);

  return {
    title,
    author,
    wordCount,
    readingTimeMinutes,
    sections: sections.length > 0 ? sections : [{ title: 'Full Text', content: text }],
  };
}
