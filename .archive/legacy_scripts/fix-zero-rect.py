import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the specific lines
old_block = """    let rect = range.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
       rect = parentEl.getBoundingClientRect();
    }

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    // Allow capturing even if height is technically 0 due to some flex/grid collapsing issues on cloned text ranges,
    // as long as it has a valid x,y position on the sheet.
    if (rect.width <= 0 || rect.height <= 0) continue;"""

new_block = """    let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
       rect = parentEl.getBoundingClientRect();
    }

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    if (rect.width === 0 && rect.height === 0) continue;"""

if old_block in code:
    code = code.replace(old_block, new_block)
    print("Replaced old block exactly.")
else:
    # Try a regex approach
    print("Exact match failed, using regex...")
    code = re.sub(r'if \(rect\.width <= 0 \|\| rect\.height <= 0\) \{', 'if (rect.width === 0 && rect.height === 0) {', code)
    code = re.sub(r'if \(rect\.width <= 0 \|\| rect\.height <= 0\) continue;', 'if (rect.width === 0 && rect.height === 0) continue;', code)

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Done zero-rect patch.")
