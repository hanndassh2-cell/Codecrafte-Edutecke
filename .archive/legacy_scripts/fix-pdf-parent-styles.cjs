const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  stage.style.visibility = "visible";
  stage.style.pointerEvents = "none";
  document.body.appendChild(stage);`;

const repl = `  stage.style.visibility = "visible";
  stage.style.pointerEvents = "none";

  // Inherit CSS variables and styles from the parent container
  const containerStyle = window.getComputedStyle(containerEl);
  stage.style.fontFamily = containerStyle.fontFamily;
  stage.style.fontSize = containerStyle.fontSize;
  stage.style.color = containerStyle.color;
  stage.style.lineHeight = containerStyle.lineHeight;

  // Manually copy inline CSS variables from the container if they exist
  const inlineStyle = containerEl.style;
  for (let i = 0; i < inlineStyle.length; i++) {
    const prop = inlineStyle[i];
    if (prop.startsWith('--')) {
      stage.style.setProperty(prop, inlineStyle.getPropertyValue(prop));
    }
  }

  // Also add pdf-print-density class if container has it
  if (containerEl.classList.contains('pdf-print-density')) {
    stage.classList.add('pdf-print-density');
  }

  document.body.appendChild(stage);`;

if (code.includes(target)) {
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code.replace(target, repl));
  console.log("Patched parent styles in V2 exporter");
} else {
  console.log("Target not found!");
}
