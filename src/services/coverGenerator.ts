// High-aesthetic designer book cover generator
// Produces authentic literary SVG covers matching the style of Lauren Groff, Sally Rooney, and Lang Leav

export function generateDesignerCover(title: string, author: string, seed = 0): string {
  // Deterministic seed based on string hash
  const str = `${title}-${author}`;
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const variant = Math.abs(hash) % 4;

  let svg = '';

  if (variant === 0) {
    // Style 1: Olive Green & Rose Trees (Lauren Groff style - Image 1 top-left)
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
        <rect width="400" height="600" fill="#f0ece1" />
        <rect x="25" y="25" width="350" height="550" fill="#75883d" rx="2" />
        <!-- Trees / Vertical trunks -->
        <g fill="#e3a7a9">
          <rect x="70" y="25" width="18" height="340" />
          <rect x="110" y="25" width="14" height="280" />
          <rect x="150" y="25" width="22" height="360" />
          <rect x="195" y="25" width="16" height="310" />
          <rect x="240" y="25" width="15" height="330" />
          <rect x="280" y="25" width="20" height="290" />
          <rect x="320" y="25" width="12" height="320" />
        </g>
        <!-- Title and Author -->
        <text x="200" y="80" text-anchor="middle" fill="#ffffff" font-family="'Newsreader', Georgia, serif" font-size="22" font-weight="700" letter-spacing="3">${escapeXml(author.toUpperCase())}</text>
        <text x="200" y="520" text-anchor="middle" fill="#ffffff" font-family="'Newsreader', Georgia, serif" font-size="20" font-weight="600" letter-spacing="2">${escapeXml(title.toUpperCase())}</text>
      </svg>
    `;
  } else if (variant === 1) {
    // Style 2: Terracotta Orange with Sardine Tin (Sally Rooney style - Image 1 top-right)
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
        <rect width="400" height="600" fill="#e75b48" />
        <rect x="15" y="15" width="370" height="570" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
        <text x="200" y="120" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="800" letter-spacing="4">${escapeXml(author.toUpperCase())}</text>
        <line x1="120" y1="145" x2="280" y2="145" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />
        
        <!-- Sardine tin illustration -->
        <g transform="translate(130, 220)">
          <rect x="0" y="15" width="140" height="70" rx="35" fill="#203d6d" stroke="#ffffff" stroke-width="2" />
          <ellipse cx="70" cy="50" rx="60" ry="25" fill="#f0ece1" />
          <!-- Sardine texture -->
          <ellipse cx="65" cy="48" rx="45" ry="12" fill="#c3d2e6" />
          <path d="M 40 48 Q 65 42 90 48" stroke="#203d6d" stroke-width="1.5" fill="none" />
          <path d="M 45 52 Q 65 46 85 52" stroke="#203d6d" stroke-width="1.5" fill="none" />
          <!-- Rolled lid -->
          <path d="M 50 15 Q 70 -5 90 15" stroke="#203d6d" stroke-width="3" fill="#ffffff" />
          <line x1="70" y1="5" x2="70" y2="-15" stroke="#203d6d" stroke-width="3" stroke-linecap="round" />
        </g>
        
        <text x="200" y="440" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="26" font-weight="800" letter-spacing="5">${escapeXml(title.toUpperCase())}</text>
      </svg>
    `;
  } else if (variant === 2) {
    // Style 3: Rose Pink with Blue Pear (Image 1 bottom-left)
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
        <rect width="400" height="600" fill="#ef628b" />
        <!-- Top typography -->
        <text x="50" y="70" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="700" letter-spacing="1">${escapeXml(author)}</text>
        <text x="50" y="95" fill="rgba(255,255,255,0.8)" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="500">${escapeXml(title)}</text>
        
        <!-- Blue Pear shape -->
        <g transform="translate(100, 160)">
          <!-- Stem -->
          <path d="M 100 35 Q 120 15 130 5" stroke="#1d4899" stroke-width="6" stroke-linecap="round" fill="none" />
          <!-- Body -->
          <path d="M 100 35 C 70 35 60 80 50 120 C 30 180 10 210 10 260 C 10 330 60 370 100 370 C 140 370 190 330 190 260 C 190 210 170 180 150 120 C 140 80 130 35 100 35 Z" fill="#1d4899" />
          <!-- Red core dot -->
          <circle cx="100" cy="260" r="14" fill="#e73322" />
        </g>
      </svg>
    `;
  } else {
    // Style 4: Cyan Blue Editorial / Portrait collage (Lang Leav style - Image 2)
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
        <rect width="400" height="600" fill="#29abe2" />
        
        <!-- Photo grid banner -->
        <g transform="translate(40, 40)">
          <rect x="0" y="0" width="150" height="130" fill="#f0ece1" rx="4" />
          <circle cx="75" cy="55" r="28" fill="#333333" />
          <path d="M 40 120 C 40 90 60 85 75 85 C 90 85 110 90 110 120 Z" fill="#333333" />
          
          <rect x="170" y="0" width="150" height="130" fill="#f0ece1" rx="4" />
          <circle cx="245" cy="55" r="28" fill="#333333" />
          <path d="M 210 120 C 210 90 230 85 245 85 C 260 85 280 90 280 120 Z" fill="#333333" />
        </g>

        <!-- Bold Title -->
        <text x="200" y="270" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="34" font-weight="900" letter-spacing="1">we</text>
        <text x="200" y="315" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="34" font-weight="900" letter-spacing="1">don’t</text>
        <text x="200" y="360" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="34" font-weight="900" letter-spacing="1">know</text>
        
        <text x="200" y="440" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="800" opacity="0.9">${escapeXml(title)}</text>
        <text x="200" y="480" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="600" opacity="0.8">by ${escapeXml(author)}</text>
      </svg>
    `;
  }

  // Convert SVG to data URI
  const encoded = encodeURIComponent(svg.trim())
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
