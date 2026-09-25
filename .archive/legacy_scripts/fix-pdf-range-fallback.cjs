const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    let rect = range.getBoundingClientRect();

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    // Allow capturing even if height is technically 0 due to some flex/grid collapsing issues on cloned text ranges,
    // as long as it has a valid x,y position on the sheet.
    if (rect.width <= 0 || rect.height <= 0) continue;`;

const repl = `    let rect = range.getBoundingClientRect();

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    // Range.getBoundingClientRect() can return 0 width/height for text nodes inside transformed containers 
    // (e.g. rotated side text) or containers with width:0. Fallback to parent element's bounding rect.
    if (rect.width <= 0 || rect.height <= 0) {
      rect = parentEl.getBoundingClientRect();
    }

    if (rect.width <= 0 || rect.height <= 0) continue;`;

if (code.includes('let rect = range.getBoundingClientRect();') || code.includes('const rect = range.getBoundingClientRect();')) {
  // Wait, I might have defined it as `const rect = ...`
  code = code.replace('const rect = range.getBoundingClientRect();', 'let rect = range.getBoundingClientRect();');
  
  if (code.includes('if (rect.width <= 0 || rect.height <= 0) continue;')) {
     code = code.replace(
       'if (rect.width <= 0 || rect.height <= 0) continue;',
       'if (rect.width <= 0 || rect.height <= 0) { rect = parentEl.getBoundingClientRect(); }\n    if (rect.width <= 0 || rect.height <= 0) continue;'
     );
     fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
     console.log("Patched rect fallback");
  } else {
     console.log("Could not find rect continue statement");
  }
} else {
  console.log("Target not found!");
}
