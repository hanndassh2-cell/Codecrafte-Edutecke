import re
with open('src/utils/pdfV2Exporter.ts', 'r') as f:
    code = f.read()
code = re.sub(r'    if \(processedText\.includes.*?\n    \}', '', code, flags=re.DOTALL)
with open('src/utils/pdfV2Exporter.ts', 'w') as f:
    f.write(code)
print("Done")
