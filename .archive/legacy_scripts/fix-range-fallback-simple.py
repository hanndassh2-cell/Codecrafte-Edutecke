import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

target = """    let rect = range.getBoundingClientRect();
    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;"""

repl = """    let rect = range.getBoundingClientRect();
    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    if (rect.width <= 0 || rect.height <= 0) {
       rect = parentEl.getBoundingClientRect();
    }
    
    if (rect.width <= 0 || rect.height <= 0) continue;"""

if target in code:
    code = code.replace(target, repl)
    with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Injected rect fallback!")
else:
    print("Could not find target!")
