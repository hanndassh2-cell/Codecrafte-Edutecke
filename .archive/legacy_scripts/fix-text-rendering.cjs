const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const textTarget = `    // Exact vector coordinates
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

const textRepl = `    // Exact vector coordinates
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
      // Determine logical alignment based on container's textAlign CSS property
      let cssAlign = style.textAlign || "left";
      
      // If we used the parent's bounding rect as a fallback, or we are in a text-aligned container,
      // it's safer to respect the alignment relative to the bounds.
      if (cssAlign === "start") cssAlign = isRtl ? "right" : "left";
      if (cssAlign === "end") cssAlign = isRtl ? "left" : "right";

      let finalX = textX;
      if (cssAlign === "center") {
         finalX = textX + textW / 2;
      } else if (cssAlign === "right") {
         finalX = textX + textW;
      } else {
         finalX = textX;
      }
      
      // If the rect is a tight text bound, then left/center/right within this box yields the exact same absolute physical position!
      doc.text(processedText, finalX, textY, {
         align: cssAlign === "justify" ? (isRtl ? "right" : "left") : (cssAlign as any),
      });
    }`;

// use regex because exact string matching with all whitespace is brittle
let success = false;
const blockToReplace = /    \/\/ Exact vector coordinates[\s\S]*?align: "left",\n      }\);\n    \}/;
if (code.match(blockToReplace)) {
  code = code.replace(blockToReplace, textRepl);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Replaced text rendering block successfully");
  success = true;
} else {
  console.log("Could not find text rendering block");
}
