import re

with open('src/utils/pdfV2Exporter.ts', 'r') as f:
    code = f.read()

target = r"""function parseColorToRgb\(colorStr: string\): ParsedColor \| null \{.*?return null;\s*\}\s*\}"""

replacement = """const _colorCache = new Map<string, ParsedColor | null>();
let _sharedCtx: CanvasRenderingContext2D | null = null;

function parseColorToRgb(colorStr: string): ParsedColor | null {
  if (!colorStr || colorStr === "transparent" || colorStr === "inherit" || colorStr === "initial" || colorStr === "none" || colorStr === "rgba(0, 0, 0, 0)") {
    return null;
  }
  if (_colorCache.has(colorStr)) return _colorCache.get(colorStr) || null;

  const rgbMatch = colorStr.match(/rgba?\\s*\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)/i);
  if (rgbMatch) {
    const res = {
      r: Math.round(parseFloat(rgbMatch[1])),
      g: Math.round(parseFloat(rgbMatch[2])),
      b: Math.round(parseFloat(rgbMatch[3])),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
    };
    _colorCache.set(colorStr, res);
    return res;
  }

  if (!_sharedCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    _sharedCtx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!_sharedCtx) return null;

  _sharedCtx.clearRect(0, 0, 1, 1);
  _sharedCtx.fillStyle = colorStr;
  _sharedCtx.fillRect(0, 0, 1, 1);
  const data = _sharedCtx.getImageData(0, 0, 1, 1).data;
  
  if (data[3] === 0) {
    _colorCache.set(colorStr, null);
    return null;
  }
  
  const res = { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
  _colorCache.set(colorStr, res);
  return res;
}"""

new_code = re.sub(target, replacement, code, flags=re.DOTALL)
with open('src/utils/pdfV2Exporter.ts', 'w') as f:
    f.write(new_code)

print("Replaced!")
