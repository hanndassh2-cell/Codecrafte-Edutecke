const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

// 1. Enhance waitForMathAndFontsV2 to be extremely thorough
const waitTarget = `async function waitForMathAndFontsV2(container: HTMLElement): Promise<void> {`;
const waitReplacement = `async function waitForMathAndFontsV2(container: HTMLElement): Promise<void> {
  // 1. Wait for fonts
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }
  
  // 2. Wait for all images
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
  
  // 3. Wait for KaTeX to finish rendering (if there are math elements)
  await new Promise(resolve => setTimeout(resolve, 500)); // Fixed buffer for React renders
  
  // 4. Next Animation Frames to ensure DOM is visually settled
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
`;
if (code.includes(waitTarget) && !code.includes('requestAnimationFrame')) {
  code = code.replace(waitTarget, waitReplacement);
}

// 2. Add Tracing and robust Stage in buildJsPdfV2Instance
const buildTarget = `  // Isolation stage for rendering hidden pages and bypassing zoom
  const stage = document.createElement("div");
  stage.id = "pdf-v2-export-isolation-stage";
  stage.className = "print-preview-modal-root";
  stage.style.position = "fixed";`;

const buildReplacement = `  // Isolation stage for rendering hidden pages and bypassing zoom
  const stage = document.createElement("div");
  stage.id = "pdf-v2-export-isolation-stage";
  stage.className = "print-preview-modal-root";
  stage.setAttribute("dir", "rtl"); // Ensure RTL context for layout
  stage.style.position = "fixed";`;
if (code.includes(buildTarget)) {
  code = code.replace(buildTarget, buildReplacement);
}

const loopTarget = `      stage.innerHTML = "";
      const clonedSheet = sheet.cloneNode(true) as HTMLElement;

      clonedSheet.style.transform = "none";`;

const loopReplacement = `      stage.innerHTML = "";
      const clonedSheet = sheet.cloneNode(true) as HTMLElement;
      
      const sourceCount = sheet.querySelectorAll("*").length;
      const sourceCards = sheet.querySelectorAll(".editor-card-container, .preview-card, .question-renderer-block").length;
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Source DOM: \${sourceCount} elements, \${sourceCards} cards\`);

      clonedSheet.style.transform = "none";`;
if (code.includes(loopTarget)) {
  code = code.replace(loopTarget, loopReplacement);
}

const appendTarget = `      stage.appendChild(clonedSheet);
      // Wait for layout
      await new Promise((r) => setTimeout(r, 150));

      await renderSheetVectorAndLiveText(clonedSheet, pdf, i, fonts, options);`;

const appendReplacement = `      stage.appendChild(clonedSheet);
      // Force layout and wait for next frame
      clonedSheet.getBoundingClientRect();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((r) => setTimeout(r, 200));

      const cloneCount = clonedSheet.querySelectorAll("*").length;
      const cloneCards = clonedSheet.querySelectorAll(".editor-card-container, .preview-card, .question-renderer-block").length;
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Cloned DOM: \${cloneCount} elements, \${cloneCards} cards\`);
      
      let zeroSize = 0;
      clonedSheet.querySelectorAll("*").forEach(el => {
         const rect = el.getBoundingClientRect();
         if (rect.width === 0 || rect.height === 0) zeroSize++;
      });
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Zero Size Elements: \${zeroSize} / \${cloneCount}\`);

      await renderSheetVectorAndLiveText(clonedSheet, pdf, i, fonts, options);`;
if (code.includes(appendTarget)) {
  code = code.replace(appendTarget, appendReplacement);
}

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("PDF V2 Fixed");
