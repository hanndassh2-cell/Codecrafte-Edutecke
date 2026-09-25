import re

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'r', encoding='utf-8') as f:
    code = f.read()

target = """      const widgetDom = document.createElement(isBlock ? "div" : "span");
      widgetDom.className = isBlock
        ? "math-rendered-block my-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-lg text-center cursor-pointer select-none border border-blue-200 dark:border-blue-900/50 hover:border-blue-400 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] group/math"
        : "math-rendered-inline inline-block px-1.5 py-0.5 mx-0.5 bg-blue-50/80 dark:bg-blue-950/50 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer select-none align-baseline hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-all border border-blue-200/80 dark:border-blue-800/50 hover:border-blue-400 active:scale-[0.98] group/math";
      widgetDom.dir = "ltr";"""

replacement = """      const widgetDom = document.createElement(isBlock ? "div" : "span");
      widgetDom.className = isBlock
        ? "math-rendered-block my-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-lg text-center cursor-pointer border border-blue-200 dark:border-blue-900/50 hover:border-blue-400 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] group/math"
        : "math-rendered-inline inline-block px-1.5 py-0.5 mx-0.5 bg-blue-50/80 dark:bg-blue-950/50 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer align-baseline hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-all border border-blue-200/80 dark:border-blue-800/50 hover:border-blue-400 active:scale-[0.98] group/math";
      widgetDom.dir = "ltr";
      
      // Inherit inline styles (font size, font family, color, bold, italic) from the raw text node's marks
      try {
        const resolved = doc.resolve(matchStart);
        const textNode = resolved.nodeAfter;
        if (textNode && textNode.marks) {
          textNode.marks.forEach(mark => {
            if (mark.type.name === 'textStyle') {
              if (mark.attrs.fontSize) widgetDom.style.fontSize = mark.attrs.fontSize;
              if (mark.attrs.fontFamily) widgetDom.style.fontFamily = mark.attrs.fontFamily;
              if (mark.attrs.color) widgetDom.style.color = mark.attrs.color;
            }
            if (mark.type.name === 'bold') widgetDom.style.fontWeight = 'bold';
            if (mark.type.name === 'italic') widgetDom.style.fontStyle = 'italic';
            if (mark.type.name === 'underline') widgetDom.style.textDecoration = 'underline';
          });
        }
      } catch (e) {
        console.warn("Could not resolve marks for math decoration", e);
      }
"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced successfully!")
else:
    print("Target not found.")

