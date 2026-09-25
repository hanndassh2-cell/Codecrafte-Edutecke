const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  // Inherit CSS variables and styles from the parent container
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
  }`;

const repl = `  // Find the a4-preview-container if it exists inside containerEl
  const previewContainer = containerEl.querySelector('.a4-preview-container') || containerEl;

  // Inherit CSS variables and styles from the parent container
  const containerStyle = window.getComputedStyle(previewContainer);
  stage.style.fontFamily = containerStyle.fontFamily;
  stage.style.fontSize = containerStyle.fontSize;
  stage.style.color = containerStyle.color;
  stage.style.lineHeight = containerStyle.lineHeight;

  // Manually copy inline CSS variables from the container if they exist
  const inlineStyle = (previewContainer as HTMLElement).style || containerEl.style;
  for (let i = 0; i < inlineStyle.length; i++) {
    const prop = inlineStyle[i];
    if (prop.startsWith('--')) {
      stage.style.setProperty(prop, inlineStyle.getPropertyValue(prop));
    }
  }`;

if (code.includes('const containerStyle = window.getComputedStyle(containerEl);')) {
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code.replace(target, repl));
  console.log("Patched to use a4-preview-container styles");
} else {
  console.log("Target not found!");
}
