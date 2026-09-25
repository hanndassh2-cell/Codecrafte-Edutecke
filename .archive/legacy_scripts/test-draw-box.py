import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

repl = """
      if (processedText.includes("يمنع")) {
         doc.setDrawColor(255, 0, 0);
         doc.rect(cx - 10, cy - 10, 20, 20);
         doc.text("X", cx, cy, { align: "center", baseline: "middle" });
      }
"""

code = code.replace('doc.text(processedText, cx, cy, {', repl + '\n      doc.text(processedText, cx, cy, {')
with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Injected draw box")
