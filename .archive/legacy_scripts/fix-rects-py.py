import re

with open('src/utils/pdfV2Exporter.ts', 'r') as f:
    code = f.read()

target = r"""    /\* removed no-print skip \*/
    const rect = el\.getBoundingClientRect\(\);
    if \(rect\.width <= 0 \|\| rect\.height <= 0\) continue;"""

replacement = """    /* removed no-print skip */
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    if (rect.width <= 0 || rect.height <= 0) {
      if (el.tagName !== "DIV" && el.tagName !== "SPAN" && el.tagName !== "P") continue;
    }"""

new_code = re.sub(target, replacement, code)
with open('src/utils/pdfV2Exporter.ts', 'w') as f:
    f.write(new_code)

print("Fixed rects")
