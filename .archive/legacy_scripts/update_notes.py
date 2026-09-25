import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """          return [{
            id: p.id,
            content: (
              <div 
                className={`rounded-xl border ${colorClass} shadow-3xs break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0`}
                style={{ padding: cardPaddingStyle }}
              >
                <div className="whitespace-normal text-justify [&>div>*:last-child]:mb-0 [&>*:last-child]:mb-0">
                  <RichTextEditor value={(data.text || "").replace(/(<p><br><\/p>\s*)+$/g, "").replace(/(<br\s*\/?>\s*)+$/g, "")} readOnly />
                </div>
              </div>
            )
          }];"""

replacement = """          const noteHtml = (data.text || "").replace(/(<p><br><\/p>\s*)+$/g, "").replace(/(<br\s*\/?>\s*)+$/g, "");
          const noteBlocks = splitHtmlIntoBlocks(noteHtml);
          
          return noteBlocks.map((block, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === noteBlocks.length - 1;
            return {
              id: `${p.id}-${idx}`,
              content: (
                <div 
                  className={`transition-all rounded-xl border ${colorClass} shadow-3xs break-inside-auto print:orphans-4 print:widows-4 print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0 ${!isFirst ? "mt-0 pt-0 border-t-0 rounded-t-none" : ""} ${!isLast ? "mb-0 pb-0 border-b-0 rounded-b-none" : ""}`}
                  style={{ 
                    padding: cardPaddingStyle,
                    ...( !isFirst ? { paddingTop: 0 } : {} ),
                    ...( !isLast ? { paddingBottom: 0 } : {} )
                  }}
                >
                  <div className="whitespace-normal text-justify [&>div>*:last-child]:mb-0 [&>*:last-child]:mb-0">
                    <RichTextEditor value={block} readOnly />
                  </div>
                </div>
              )
            };
          });"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced successfully!")
else:
    print("Target not found.")

