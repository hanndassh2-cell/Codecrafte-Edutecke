const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf-8');

const replacement = `
/* 1. Base List Containers */
.prose ul, .ProseMirror ul, .math-text-container ul, .a4-print-sheet ul,
.prose ol, .ProseMirror ol, .math-text-container ol, .a4-print-sheet ol {
  margin-block: 0.25rem 0.5rem !important;
  margin-inline: 0 !important;
  padding: 0 !important;
  list-style: none !important;
  list-style-type: none !important;
  list-style-position: outside !important;
  box-sizing: border-box !important;
}

/* Base Direction Handlers */
.prose ul:not([dir="ltr"]), .ProseMirror ul:not([dir="ltr"]), .math-text-container ul:not([dir="ltr"]), .a4-print-sheet ul:not([dir="ltr"]),
.prose ol:not([dir="ltr"]), .ProseMirror ol:not([dir="ltr"]), .math-text-container ol:not([dir="ltr"]), .a4-print-sheet ol:not([dir="ltr"]),
[dir="rtl"] ul, [dir="rtl"] ol, ul[dir="rtl"], ol[dir="rtl"] {
  direction: rtl !important;
  text-align: start !important;
  unicode-bidi: isolate !important;
}

.prose ul[dir="ltr"], .ProseMirror ul[dir="ltr"], .math-text-container ul[dir="ltr"], .a4-print-sheet ul[dir="ltr"],
.prose ol[dir="ltr"], .ProseMirror ol[dir="ltr"], .math-text-container ol[dir="ltr"], .a4-print-sheet ol[dir="ltr"],
[dir="ltr"] ul:not([dir="rtl"]), [dir="ltr"] ol:not([dir="rtl"]) {
  direction: ltr !important;
  text-align: start !important;
  unicode-bidi: isolate !important;
}

/* 2. Base List Items (Self-contained Indentation & Alignment per Item) */
.prose li, .ProseMirror li, .math-text-container li, .a4-print-sheet li,
li[dir="rtl"], li[dir="ltr"], li {
  position: relative !important;
  line-height: 1.6 !important;
  min-height: 1.5em !important;
  margin-block: 0.15rem !important;
  margin-inline: 0 !important;
  padding-block: 0 !important;
  padding-inline-start: 2rem !important;
  padding-inline-end: 0 !important;
  list-style: none !important;
  list-style-type: none !important;
  unicode-bidi: isolate !important;
  box-sizing: border-box !important;
  text-align: start !important;
}

/* Explicit Item Directions */
li[dir="rtl"] { direction: rtl !important; }
li[dir="ltr"] { direction: ltr !important; }

/* Nested Lists (Sub-levels / Multi-level indentation) */
.prose ul ul, .prose ul ol, .prose ol ul, .prose ol ol,
.ProseMirror ul ul, .ProseMirror ul ol, .ProseMirror ol ul, .ProseMirror ol ol,
.math-text-container ul ul, .math-text-container ul ol, .math-text-container ol ul, .math-text-container ol ol,
.a4-print-sheet ul ul, .a4-print-sheet ul ol, .a4-print-sheet ol ul, .a4-print-sheet ol ol {
  margin-block: 0.15rem !important;
  margin-inline-start: 1.5rem !important;
  margin-inline-end: 0 !important;
  padding: 0 !important;
}

/* Paragraphs & direct block children inside List Item */
.prose li > p, .ProseMirror li > p, .math-text-container li > p, .a4-print-sheet li > p,
.prose li > div, .ProseMirror li > div, .math-text-container li > div, .a4-print-sheet li > div {
  margin-block: 0 !important;
  margin-inline: 0 !important;
  padding: 0 !important;
  line-height: inherit !important;
  display: block !important;
  unicode-bidi: isolate !important;
}

/* 3. Base Marker Pseudo-Element (Marker placed inside dedicated padding box) */
.prose ul > li::before, .ProseMirror ul > li::before, .math-text-container ul > li::before, .a4-print-sheet ul > li::before,
.prose ol > li::before, .ProseMirror ol > li::before, .math-text-container ol > li::before, .a4-print-sheet ol > li::before {
  position: absolute !important;
  top: 0 !important;
  inset-inline-start: 0 !important;
  inset-inline-end: auto !important;
  height: 1.6em !important;
  width: 1.75rem !important;
  font-weight: 600 !important;
  font-variant-numeric: tabular-nums !important;
  color: currentColor !important;
  pointer-events: none !important;
  user-select: none !important;
  line-height: 1.6 !important;
  unicode-bidi: isolate !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  display: inline-flex !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  text-align: start !important;
}

/* 4. Unordered Bullet Lists - Symbol Mappings */
`;

const startIndex = css.indexOf('/* 1. Base List Containers */');
const endIndex = css.indexOf('/* 4. Unordered Bullet Lists - Symbol Mappings */');

if (startIndex !== -1 && endIndex !== -1) {
    const newCss = css.substring(0, startIndex) + replacement.trim() + '\n' + css.substring(endIndex);
    fs.writeFileSync('src/index.css', newCss);
    console.log("Successfully replaced list engine styles!");
} else {
    console.log("Could not find start/end indices");
}
