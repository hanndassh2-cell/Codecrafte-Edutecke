import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

repl = """
    if (Math.abs(angleDeg) > 5) {
      // For rotated Arabic text, jsPDF often fails to render or position correctly.
      // We will render it as an image using html2canvas.
      try {
        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.top = "-9999px";
        tempContainer.style.left = "-9999px";
        // copy styles
        tempContainer.style.fontFamily = style.fontFamily;
        tempContainer.style.fontSize = style.fontSize;
        tempContainer.style.color = style.color;
        tempContainer.style.fontWeight = style.fontWeight;
        tempContainer.style.transform = style.transform;
        tempContainer.style.transformOrigin = "center center";
        tempContainer.style.whiteSpace = "nowrap";
        tempContainer.innerText = processedText;
        document.body.appendChild(tempContainer);
        
        // Use htmlToImage to convert to PNG
        const svgDataUrl = await htmlToImage.toPng(parentEl, {
          pixelRatio: 3,
          backgroundColor: "transparent",
        });
        
        document.body.removeChild(tempContainer);
        
        if (svgDataUrl) {
          const cx = (rect.left - sheetRect.left) * scaleX;
          const cy = (rect.top - sheetRect.top) * scaleY;
          doc.addImage(svgDataUrl, "PNG", cx, cy, rect.width * scaleX, rect.height * scaleY, undefined, "FAST");
        }
      } catch (e) {
        console.error("Failed to rasterize rotated text", e);
      }
    } else {
"""

# Let's replace the block `if (Math.abs(angleDeg) > 5) { ... } else {`
# We'll use regex to find the block
import re
code = re.sub(r'if \(Math\.abs\(angleDeg\) > 5\) \{[\s\S]*?\} else \{', repl, code)

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Replaced rotated text logic with rasterization")
