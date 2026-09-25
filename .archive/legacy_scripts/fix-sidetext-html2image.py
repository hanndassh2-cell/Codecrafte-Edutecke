import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace htmlToImage.toPng(parentEl with htmlToImage.toPng(tempContainer
code = code.replace("const svgDataUrl = await htmlToImage.toPng(parentEl,", "const svgDataUrl = await htmlToImage.toPng(tempContainer,")

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed parentEl to tempContainer")
