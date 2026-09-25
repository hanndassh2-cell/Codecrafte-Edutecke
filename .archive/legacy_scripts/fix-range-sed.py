import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# find let rect = range.getBoundingClientRect();
# and replace it.

repl = """    let rect = range.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
       rect = parentEl.getBoundingClientRect();
    }"""

code = code.replace("let rect = range.getBoundingClientRect();", repl)

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Sed-like replaced!")
