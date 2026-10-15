# enzo — Minimalist Literary Reading PWA

A quiet, intimate personal digital library and reader inspired by the atmosphere of physical books, literary journals, and independent bookstores.

Built as a Progressive Web App (PWA) with **zero backend, zero databases, and zero tracking**. All your books, reading progress, and personal journal notes remain entirely on your own devices.

---

## Highlights

- **Backend-Free Architecture**: Operates 100% client-side using browser **IndexedDB** for binary ebook storage and reading state.
- **Laptop-to-Phone Sync**: Honest, practical cross-device transfer without cloud servers. Export your entire library as an archive (`enzo-library.zip`) on your laptop and restore it on your phone with bookmarks and reflections intact.
- **EPUB Engine**: Authentic chapter-by-chapter reading, semantic formatting, table of contents, and embedded illustration support.
- **PDF Engine**: High-fidelity canvas rendering powered by PDF.js with zoom, fit-width, page navigation, and automatic cover thumbnail generation.
- **TXT & Markdown**: Typeset plain text with chapter detection and estimated reading time.
- **Distraction-Free Reader**: Dedicated immersive mode, auto-hiding controls, and reader customization:
  - **4 Editorial Themes**: Warm Paper (`#fbf8f2`), Pure White, Sepia (`#f4edd8`), and Dark Ink (`#141413`).
  - **Literary Typefaces**: *Newsreader*, *EB Garamond*, *Plus Jakarta Sans*, and high-legibility Dyslexic.
  - Custom column widths (Narrow, Medium, Wide, Full) and page margins.
- **Reading Journal**: Highlight text while reading to save passages, personal reflections, and quotes. Filter by book and copy formatted quotes with one click.
- **Library Organization**:
  - Welcoming editorial dashboard with "Continue Reading" resume card.
  - 3 viewing modes: **Cover Grid**, **Compact List**, and **Bookshelf View**.
  - Search by title or author, filter by format or completion status, and sort.
- **PWA & Offline**: Installable on iOS, Android, macOS, and Windows. Service worker caches the application shell so you can read offline anywhere.

---

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Storage**: IndexedDB (via `idb`)
- **Document Processing**: `jszip` (EPUB parsing & library ZIP export/import), `pdfjs-dist` (PDF rendering)
- **Icons**: `lucide-react`
- **Typography**: Google Fonts (*Newsreader*, *EB Garamond*, *Plus Jakarta Sans*)
- **Deployment**: Vercel (static single-page application)

---

## Laptop-to-Phone Transfer Workflow

Because browser storage (IndexedDB) is sandboxed to each device, enzo provides a clean, transparent export and import system:

1. **On your Laptop**:
   - Open enzo, import your EPUB, PDF, or TXT files.
   - Go to **Sync & Transfer** and click **Export Library**.
   - Your device downloads `enzo-library-YYYY-MM-DD.zip` containing all your book files, reading positions, ratings, and journal notes.
2. **Transfer**:
   - Send the ZIP to your phone via AirDrop, email attachment, Google Drive/iCloud file download, or local USB.
3. **On your Phone**:
   - Open enzo in your phone's browser (or installed PWA).
   - Go to **Sync & Transfer** and tap **Import Library**.
   - Select the ZIP file. Your entire personal library is instantly restored and available for offline reading!

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 / 22 / 24)
- npm or pnpm

### 2. Installation
```bash
npm install
```

### 3. Local Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## Deploying to Vercel

enzo is optimized for static deployment on Vercel with zero serverless functions required.

### Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```

### Deploy via GitHub / GitLab
1. Push this repository to your GitHub account.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **New Project** and import the repository.
3. Framework Preset: **Vite**.
4. Root Directory: `./`.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Click **Deploy**.

The repository includes `vercel.json` configured for SPA routing (`rewrites` to `/index.html`) and proper PWA caching headers.

---

## Privacy & Security

- All book files remain strictly inside your browser's local IndexedDB.
- No network requests are made with your book content or reading history.
- Untrusted scripts and dangerous tags in EPUB files are stripped during chapter parsing.
- Zero analytics, trackers, or external database calls.
