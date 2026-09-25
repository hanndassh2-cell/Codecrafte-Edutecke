const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const repl = `
  const debugDiv = document.createElement("div");
  debugDiv.style.position = "fixed";
  debugDiv.style.top = "10px";
  debugDiv.style.left = "10px";
  debugDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
  debugDiv.style.color = "lime";
  debugDiv.style.padding = "10px";
  debugDiv.style.zIndex = "99999";
  debugDiv.style.maxHeight = "90vh";
  debugDiv.style.overflow = "auto";
  debugDiv.id = "pdf-debug";
  document.body.appendChild(debugDiv);
  const log = (msg) => { debugDiv.innerHTML += msg + "<br/>"; console.log(msg); };

  log("Starting V2 Export...");
  log("Sheet Rect: " + JSON.stringify(sheetRect));
`;

code = code.replace(`const sheetRect = sheet.getBoundingClientRect();`, `const sheetRect = sheet.getBoundingClientRect();` + repl);

const replText = `
    const processedText = textContent;
    if (processedText.includes("السؤال الأول") || processedText.includes("الزمن")) {
      log("TEXT: " + processedText + " x: " + textX + " y: " + textY + " parentOpacity: " + style.opacity);
    }
`;
code = code.replace(`const processedText = textContent;`, replText);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Injected UI debug");
