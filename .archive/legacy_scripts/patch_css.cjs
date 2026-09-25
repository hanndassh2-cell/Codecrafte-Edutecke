const fs = require('fs');
const file = 'src/index.css';
let code = fs.readFileSync(file, 'utf8');

const newCSS = `
/* =========================================================================
   UNIFIED CARD SPACING (Single Source of Truth)
   Dynamic variable for per-card line spacing
   ========================================================================= */
.exam-question-item p, .exam-question-item li, .exam-question-item div,
.lesson-card p, .lesson-card li, .lesson-card div,
.math-text-container p, .math-text-container li {
  margin-bottom: calc(0.25rem + var(--card-line-spacing, 0px)) !important;
  margin-top: calc(0.15rem + (var(--card-line-spacing, 0px) / 2)) !important;
  line-height: calc(1.6 + (var(--card-line-spacing, 0px) / 20)) !important;
}

/* Centralized Table Styling to prevent spacing overlap */
.exam-question-item table, .lesson-card table, .math-text-container table {
  border-collapse: collapse !important;
  margin-block: calc(0.5rem + var(--card-line-spacing, 0px)) !important;
}

.exam-question-item th, .exam-question-item td,
.lesson-card th, .lesson-card td,
.math-text-container th, .math-text-container td {
  padding: 0.5rem !important;
  line-height: 1.4 !important;
  margin: 0 !important;
}
`;

// Insert after tailwind import
if (code.includes('@import "tailwindcss";')) {
    code = code.replace('@import "tailwindcss";', '@import "tailwindcss";\n' + newCSS);
    fs.writeFileSync(file, code);
    console.log('Patched index.css');
}
