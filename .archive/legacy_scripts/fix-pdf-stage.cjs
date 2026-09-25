const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

code = code.replace('stage.style.top = "-10000px";', 'stage.style.top = "0px";\\n  stage.style.opacity = "0.01";\\n  stage.style.pointerEvents = "none";');
code = code.replace('stage.style.left = "-10000px";', 'stage.style.left = "0px";');

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Stage fixed");
