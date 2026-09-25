const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `async function waitForMathAndFontsV2(container: HTMLElement): Promise<void> {
  // 1. Wait for fonts
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }
  
  // 2. Wait for all images
  const newImgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(newImgs.map(img => {
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

  // 1. Wait for fonts
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // 2. Wait for all images to load
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // 3. Force reflow for Math/KaTeX and wait
  const mathEls = container.querySelectorAll(
    ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, svg, math, img"
  );
  if (mathEls.length > 0) {
    // Math/SVG needs extra time in some browsers to properly settle vectors
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}`;

const replacement = `async function waitForMathAndFontsV2(container: HTMLElement): Promise<void> {
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
  
  // 3. Wait for KaTeX to finish rendering
  const mathEls = container.querySelectorAll(".katex");
  if (mathEls.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 800));
  } else {
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // 4. Next Animation Frames to ensure DOM is visually settled
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Fixed waitForMathAndFontsV2");
