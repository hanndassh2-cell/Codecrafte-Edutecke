const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

// fix style error
code = code.replace(
  `    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    // Allow capturing even if height is technically 0 due to some flex/grid collapsing issues on cloned text ranges,
    // as long as it has a valid x,y position on the sheet.
    if (rect.x === 0 && rect.y === 0 && rect.width === 0) continue;

    const style = window.getComputedStyle(parentEl);`,
    
  `    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    // Allow capturing even if height is technically 0 due to some flex/grid collapsing issues on cloned text ranges,
    // as long as it has a valid x,y position on the sheet.
    if (rect.x === 0 && rect.y === 0 && rect.width === 0) continue;`
);

// fix \n error
code = code.replace(
  `stage.style.top = "0px";\\n  stage.style.opacity = "0.01";\\n  stage.style.pointerEvents = "none";`,
  `stage.style.top = "0px"; stage.style.opacity = "0.01"; stage.style.pointerEvents = "none";`
);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Fixed errors");
