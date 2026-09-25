import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

repl = """
    if (Math.abs(angleDeg) > 5) {
      // Let's rely on doc.text for vector crispness. 
      // cx, cy should be the center of the bounding box.
      const cx = (rect.left - sheetRect.left + rect.width / 2) * scaleX;
      const cy = (rect.top - sheetRect.top + rect.height / 2) * scaleY;
      
      doc.text(processedText, cx, cy, {
        align: "center",
        baseline: "middle",
        angle: -angleDeg,
      });
    } else {
"""

code = re.sub(r'if \(Math\.abs\(angleDeg\) > 5\) \{[\s\S]*?\} else \{', repl, code)

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Reverted to vector side text")
