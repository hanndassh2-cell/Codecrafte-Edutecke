import re

with open('src/utils/pdfV2Exporter.ts', 'r') as f:
    code = f.read()

target = r"""    const rect = el.getBoundingClientRect\(\);
    const style = window.getComputedStyle\(el\);
    if \(style.display === "none" \|\| style.visibility === "hidden" \|\| style.opacity === "0"\) continue;
    if \(rect.width <= 0 \|\| rect.height <= 0\) \{
      if \(el.tagName !== "DIV" && el.tagName !== "SPAN" && el.tagName !== "P"\) continue;
    \}

    const x = \(rect.left - sheetRect.left\) \* scaleX;
    const y = \(rect.top - sheetRect.top\) \* scaleY;
    const w = rect.width \* scaleX;
    const h = rect.height \* scaleY;
    const style = window.getComputedStyle\(el\);"""

replacement = """    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    if (rect.width <= 0 || rect.height <= 0) {
      if (el.tagName !== "DIV" && el.tagName !== "SPAN" && el.tagName !== "P") continue;
    }

    const x = (rect.left - sheetRect.left) * scaleX;
    const y = (rect.top - sheetRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;"""

new_code = re.sub(target, lambda m: replacement, code, flags=re.DOTALL)
with open('src/utils/pdfV2Exporter.ts', 'w') as f:
    f.write(new_code)

print("Fixed duplicate style declaration")
