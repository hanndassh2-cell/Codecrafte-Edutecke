import re

with open('src/utils/pdfV2Exporter.ts', 'r') as f:
    code = f.read()

target = r"""function parseColorToRgb\(color: string\) {
  if \(!color \|\| color === "transparent" \|\| color === "none"\) return null;
  // rgb\(x, y, z\)
  const rgbMatch = color\.match\(/rgb\\\(\\d\+\),\\s\*\\(\\d\+\),\\s\*\\(\\d\+\)\\\)/\);
  if \(rgbMatch\) return \{ r: parseInt\(rgbMatch\[1\]\), g: parseInt\(rgbMatch\[2\]\), b: parseInt\(rgbMatch\[3\]\), a: 1 \};
  const rgbaMatch = color\.match\(/rgba\\\(\\d\+\),\\s\*\\(\\d\+\),\\s\*\\(\\d\+\),\\s\*\\(\[\\d\.\]\+\)\\\)/\);
  if \(rgbaMatch\) return \{ r: parseInt\(rgbaMatch\[1\]\), g: parseInt\(rgbaMatch\[2\]\), b: parseInt\(rgbaMatch\[3\]\), a: parseFloat\(rgbaMatch\[4\]\) \};
  return null;
}"""

replacement = """const _colorCache = new Map<string, {r: number, g: number, b: number, a: number} | null>();
let _sharedCtx: CanvasRenderingContext2D | null = null;

function parseColorToRgb(color: string) {
  if (!color || color === "transparent" || color === "none" || color === "rgba(0, 0, 0, 0)") return null;
  if (_colorCache.has(color)) return _colorCache.get(color) || null;

  const rgbMatch = color.match(/^rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)$/);
  if (rgbMatch) {
    const res = { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]), a: 1 };
    _colorCache.set(color, res);
    return res;
  }
  const rgbaMatch = color.match(/^rgba\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([\\d.]+)\\)$/);
  if (rgbaMatch) {
    const res = { r: parseInt(rgbaMatch[1]), g: parseInt(rgbaMatch[2]), b: parseInt(rgbaMatch[3]), a: parseFloat(rgbaMatch[4]) };
    _colorCache.set(color, res);
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
  _sharedCtx.fillStyle = color;
  _sharedCtx.fillRect(0, 0, 1, 1);
  const data = _sharedCtx.getImageData(0, 0, 1, 1).data;
  
  if (data[3] === 0) {
    _colorCache.set(color, null);
    return null;
  }
  
  const res = { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
  _colorCache.set(color, res);
  return res;
}"""

if "const rgbMatch = color.match(/rgb" in code:
    print("Found target")
    # Using python string replace since regex might fail on some chars
    start_idx = code.find("function parseColorToRgb(color: string) {")
    end_idx = code.find("}", start_idx) + 1
    new_code = code[:start_idx] + replacement + code[end_idx:]
    with open('src/utils/pdfV2Exporter.ts', 'w') as f:
        f.write(new_code)
    print("Replaced!")
else:
    print("Not found")

