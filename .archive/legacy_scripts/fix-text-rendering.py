import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r'    // Exact vector coordinates.*?    \/\/ Exact vector coordinates.*?align: "left",\n      }\);\n    \}'
# Actually let's just find `// Exact vector coordinates` to the end of the for loop.
pattern = r'    // Exact vector coordinates.*?    \} else \{\n.*?if \(isRtl\) \{\n.*?align: "right",\n.*?\}\);\n.*?\} else \{\n.*?align: "left",\n.*?\}\);\n.*?\}\n.*?\}'

match = re.search(r'    // Exact vector coordinates[\s\S]*?align: "left",\n        }\);\n      }\n    \}', code)
if match:
    print("Found exact block!")
    
    repl = """    // Exact vector coordinates
    const textX = (rect.left - sheetRect.left) * scaleX;
    const textW = rect.width * scaleX;
    const textY = (rect.top - sheetRect.top + rect.height * 0.78) * scaleY;

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
      
      // Some jsPDF fonts might struggle with baseline: 'middle'. We can manually adjust cy based on height.
      // But baseline: middle usually works if not arabic. Let's try it.
      doc.text(processedText, cx, cy, {
        align: "center",
        baseline: "middle",
        angle: -angleDeg,
      });
    } else {
      let cssAlign = style.textAlign || "left";
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
      
      doc.text(processedText, finalX, textY, {
         align: cssAlign === "justify" ? (isRtl ? "right" : "left") : cssAlign,
      });
    }"""
    
    code = code[:match.start()] + repl + code[match.end():]
    with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched text block!")
else:
    print("Did not find block")
