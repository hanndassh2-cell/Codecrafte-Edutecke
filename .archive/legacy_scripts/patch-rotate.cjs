const fs = require('fs');

let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    // Exact vector coordinates
    const textX = (rect.left - sheetRect.left) * scaleX;
    const textW = rect.width * scaleX;
    // Baseline is approximately 78% down the bounding height for Arabic/Latin typography
    const textY = (rect.top - sheetRect.top + rect.height * 0.78) * scaleY;

    // Reshape & Bidi format text
    
    const processedText = textContent;




    if (isRtl) {
      // Align to right edge of text rect for RTL
      doc.text(processedText, textX + textW, textY, {
        align: "right",
      });
    } else {
      doc.text(processedText, textX, textY, {
        align: "left",
      });
    }`;

const repl = `    // Exact vector coordinates
    const textX = (rect.left - sheetRect.left) * scaleX;
    const textW = rect.width * scaleX;
    // Baseline is approximately 78% down the bounding height for Arabic/Latin typography
    const textY = (rect.top - sheetRect.top + rect.height * 0.78) * scaleY;

    // Detect rotation
    let angleDeg = 0;
    if (style.transform && style.transform !== "none") {
      const match = style.transform.match(/matrix\\((.+)\\)/);
      if (match) {
        const values = match[1].split(',').map(parseFloat);
        if (values.length >= 6) {
          angleDeg = Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
        }
      }
    }

    const processedText = textContent;

    if (Math.abs(angleDeg) > 5) {
      const cx = (rect.left - sheetRect.left + rect.width / 2) * scaleX;
      const cy = (rect.top - sheetRect.top + rect.height / 2) * scaleY;
      doc.text(processedText, cx, cy, {
        align: "center",
        baseline: "middle",
        angle: -angleDeg,
      });
    } else {
      if (isRtl) {
        // Align to right edge of text rect for RTL
        doc.text(processedText, textX + textW, textY, {
          align: "right",
        });
      } else {
        doc.text(processedText, textX, textY, {
          align: "left",
        });
      }
    }`;

if (code.includes('const processedText = textContent;')) {
  // It's a bit hard to match exact string with all the whitespace, let's use regex
  code = code.replace(/    \/\/ Exact vector coordinates[\s\S]*?align: "left",\n      }\);\n    \}/, repl);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Patched");
} else {
  console.log("Could not find target block");
}
