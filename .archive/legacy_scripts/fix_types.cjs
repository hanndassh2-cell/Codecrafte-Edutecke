const fs = require('fs');
const file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');

// The file has multiple identical definitions because I might have run the tool multiple times.
// We just remove duplicate ones.
let replacedCount = 0;
code = code.replace(/  lineSpacing\?: number;\n/g, (match) => {
    replacedCount++;
    // Keep it if it's the first one in the block, otherwise replace with empty string
    return match; // Actually doing it properly with a better regex or manually
});

// simpler way: just remove all then add them back properly.
code = code.replace(/  lineSpacing\?: number;\n/g, "");

// Add back to paragraph interface (1st interface typically is Question or similar)
code = code.replace(
  /export interface Question \{/g,
  "export interface Question {\n  lineSpacing?: number;"
);

code = code.replace(
  /export interface QuestionSnapshot \{/g,
  "export interface QuestionSnapshot {\n  lineSpacing?: number;"
);

code = code.replace(
  /export interface Lesson \{/g,
  "export interface Lesson {\n  lineSpacing?: number;"
);

code = code.replace(
  /export interface Paragraph \{/g,
  "export interface Paragraph {\n  lineSpacing?: number;"
);


fs.writeFileSync(file, code);
console.log('Fixed types in types/index.ts');
