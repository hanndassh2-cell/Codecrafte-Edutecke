import re
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add zero padding/margin to .my-2.5 inside print sheets
css += "\n\n/* Override MathText block wrapper margins in print sheet to be perfectly compact */\n.a4-print-sheet .my-2\\.5, .pdf-print-density .my-2\\.5 {\n  margin-top: 2px !important;\n  margin-bottom: 2px !important;\n  padding-top: 0px !important;\n  padding-bottom: 0px !important;\n}\n"
css += ".a4-print-sheet .py-3\\.5, .pdf-print-density .py-3\\.5 {\n  padding-top: 0px !important;\n  padding-bottom: 0px !important;\n}\n"

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Fixed math block margins")
