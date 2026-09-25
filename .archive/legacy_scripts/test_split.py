import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add splitHtmlIntoBlocks helper outside the component
if "function splitHtmlIntoBlocks" not in code:
    helper = """
function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  // Ensure we only run in browser
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {
    blocks.push(child.outerHTML);
  });
  
  return blocks.length > 0 ? blocks : [html];
}
"""
    code = code.replace('export function PreviewPanel', helper + '\nexport function PreviewPanel')

# Replace the block
target = """      return [{
        id: p.id,
        forceBreakAfter: p.forceBreakAfter,
        forceBreakBefore: p.forceBreakBefore,
        content: (
          <section
            className={`transition-all ${isLargeText ? "break-inside-auto print:orphans-4 print:widows-4" : "break-inside-avoid"} ${cardColorClass} ${isMinimal ? "" : "shadow-3xs print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0"}`}
            style={{
              padding: isMinimal ? undefined : cardPaddingStyle,
            }}
          >
            {p.forceBreakAfter && (
              <div className="print:hidden text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded inline-flex items-center gap-1 font-bold mb-2">
                <BetweenVerticalEnd className="w-3 h-3" />
                <span>فاصل صفحة مجبر بعدها</span>
              </div>
            )}
            {p.title && p.type !== "explanation" && (
              <h3
                className={`font-extrabold mb-1.5 flex items-center gap-2 ${
                  isMinimal 
                    ? `border-b-[3px] border-slate-800 dark:border-slate-200 pb-1.5 ${p.style?.color || "text-slate-900 dark:text-slate-100"}`
                    : `opacity-95 ${currentPalette.accent}`
                }`}
                style={{
                  fontFamily: p.style?.fontFamily || activeTemplate.typography?.fontFamily,
                  fontSize: p.style?.fontSize
                    ? (typeof p.style.fontSize === 'number' ? `${p.style.fontSize}px` : p.style.fontSize)
                    : `${activeTemplate.typography?.headingSize || 18}px`,
                  color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined
                }}
              >
                {p.title}
              </h3>
            )}
            <div
              className="text-slate-800 dark:text-slate-200 whitespace-normal text-justify [&>div>*:last-child]:mb-0 [&>*:last-child]:mb-0"
              style={{
                lineHeight: activeTemplate.typography?.lineSpacing || 1.6,
              }}
            >
              <RichTextEditor value={(p.body || "").replace(/(<p><br><\/p>\s*)+$/g, "").replace(/(<br\s*\/?>\s*)+$/g, "")} readOnly />
            </div>
          </section>
        )
      }];"""

replacement = """      // Split large text blocks (explanation, concepts, etc) into chunks so PaginatedA4Preview can paginate them properly
      let blocks = [ (p.body || "").replace(/(<p><br><\/p>\s*)+$/g, "").replace(/(<br\s*\/?>\s*)+$/g, "") ];
      
      if (isLargeText && p.type !== "tables") {
         blocks = splitHtmlIntoBlocks(blocks[0]);
      }

      return blocks.map((block, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === blocks.length - 1;
        
        return {
          id: `${p.id}-${idx}`,
          forceBreakAfter: isLast ? p.forceBreakAfter : false,
          forceBreakBefore: isFirst ? p.forceBreakBefore : false,
          content: (
            <section
              className={`transition-all ${isLargeText ? "break-inside-auto print:orphans-4 print:widows-4" : "break-inside-avoid"} ${cardColorClass} ${isMinimal ? "" : "shadow-3xs print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0"} ${(!isFirst && !isMinimal) ? "mt-0 pt-0 border-t-0 rounded-t-none" : ""} ${(!isLast && !isMinimal) ? "mb-0 pb-0 border-b-0 rounded-b-none" : ""}`}
              style={{
                padding: isMinimal ? undefined : cardPaddingStyle,
                ...( !isFirst && !isMinimal ? { paddingTop: 0 } : {} ),
                ...( !isLast && !isMinimal ? { paddingBottom: 0 } : {} )
              }}
            >
              {isLast && p.forceBreakAfter && (
                <div className="print:hidden text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded inline-flex items-center gap-1 font-bold mb-2">
                  <BetweenVerticalEnd className="w-3 h-3" />
                  <span>فاصل صفحة مجبر بعدها</span>
                </div>
              )}
              {isFirst && p.title && p.type !== "explanation" && (
                <h3
                  className={`font-extrabold mb-1.5 flex items-center gap-2 ${
                    isMinimal 
                      ? `border-b-[3px] border-slate-800 dark:border-slate-200 pb-1.5 ${p.style?.color || "text-slate-900 dark:text-slate-100"}`
                      : `opacity-95 ${currentPalette.accent}`
                  }`}
                  style={{
                    fontFamily: p.style?.fontFamily || activeTemplate.typography?.fontFamily,
                    fontSize: p.style?.fontSize
                      ? (typeof p.style.fontSize === 'number' ? `${p.style.fontSize}px` : p.style.fontSize)
                      : `${activeTemplate.typography?.headingSize || 18}px`,
                    color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined
                  }}
                >
                  {p.title}
                </h3>
              )}
              <div 
                className="text-slate-800 dark:text-slate-200 whitespace-normal text-justify [&>div>*:last-child]:mb-0 [&>*:last-child]:mb-0"
                style={{
                  lineHeight: activeTemplate.typography?.lineSpacing || 1.6,
                }}
              >
                <RichTextEditor value={block} readOnly />
              </div>
            </section>
          )
        };
      });"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced successfully!")
else:
    print("Target not found. Please review the string.")
