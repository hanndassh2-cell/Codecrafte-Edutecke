const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  // 2. Wait for all images
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));`;

const replacement = `  // 2. Wait for all images
  const newImgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(newImgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));`;

code = code.replace(target, replacement);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Fixed imgs");
