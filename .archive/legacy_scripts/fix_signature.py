import re

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'r', encoding='utf-8') as f:
    code = f.read()

target = """function buildMathDecorations(
  doc: any,
  options?: TipTapMathOptions,
  getView?: () => EditorView | null
): DecorationSet {"""

replacement = """function buildMathDecorations(
  doc: any,
  options?: TipTapMathOptions,
  getView?: () => EditorView | null,
  selection?: Selection
): DecorationSet {"""

code = code.replace(target, replacement)

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed signature")
