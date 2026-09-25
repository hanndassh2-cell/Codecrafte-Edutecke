import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

repl = """    let rect = range.getBoundingClientRect();
    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    if (rect.width <= 0 || rect.height <= 0) {
       rect = parentEl.getBoundingClientRect();
    }
    
    if (rect.width <= 0 || rect.height <= 0) {
       // if still 0, maybe parent's parent?
       if (parentEl.parentElement) {
          rect = parentEl.parentElement.getBoundingClientRect();
       }
    }
    
    if (rect.width <= 0 || rect.height <= 0) continue;"""

pattern = r'    let rect = range\.getBoundingClientRect\(\);\n    const style = window\.getComputedStyle\(parentEl\);\n    if \(style\.display === "none" \|\| style\.visibility === "hidden" \|\| style\.opacity === "0"\) continue;\n\s*\/\/ Allow capturing even if height is technically 0 due to some flex/grid collapsing issues on cloned text ranges,\n    \/\/ as long as it has a valid x,y position on the sheet\.\n    if \(rect\.width <= 0 \|\| rect\.height <= 0\) continue;'

code = re.sub(pattern, repl, code)

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Injected rect fallback")
