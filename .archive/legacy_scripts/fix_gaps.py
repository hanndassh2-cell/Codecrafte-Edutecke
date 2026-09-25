import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """              className={`transition-all ${isLargeText ? "break-inside-auto print:orphans-4 print:widows-4" : "break-inside-avoid"} ${cardColorClass} ${isMinimal ? "" : "shadow-3xs print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0"} ${(!isFirst && !isMinimal) ? "mt-0 pt-0 border-t-0 rounded-t-none" : ""} ${(!isLast && !isMinimal) ? "mb-0 pb-0 border-b-0 rounded-b-none" : ""}`}
              style={{
                padding: isMinimal ? undefined : cardPaddingStyle,
                ...( !isFirst && !isMinimal ? { paddingTop: 0 } : {} ),
                ...( !isLast && !isMinimal ? { paddingBottom: 0 } : {} )
              }}"""

replacement = """              className={`transition-all ${isLargeText ? "break-inside-auto print:orphans-4 print:widows-4" : "break-inside-avoid"} ${cardColorClass} ${isMinimal ? "" : "shadow-3xs print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0"} ${(!isFirst && !isMinimal) ? "mt-0 pt-0 border-t-0 rounded-t-none" : ""} ${(!isLast && !isMinimal) ? "mb-0 pb-0 border-b-0 rounded-b-none" : ""}`}
              style={{
                padding: isMinimal ? undefined : cardPaddingStyle,
                ...( !isFirst && !isMinimal ? { paddingTop: 0, marginTop: `-${activeTemplate.typography?.cardSpacing ?? (activeTemplate.typography?.questionSpacing ?? 16)}px` } : {} ),
                ...( !isLast && !isMinimal ? { paddingBottom: 0 } : {} )
              }}"""

if target in code:
    code = code.replace(target, replacement)
    
    # Also do the same for notes
    target2 = """                  className={`transition-all rounded-xl border ${colorClass} shadow-3xs break-inside-auto print:orphans-4 print:widows-4 print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0 ${!isFirst ? "mt-0 pt-0 border-t-0 rounded-t-none" : ""} ${!isLast ? "mb-0 pb-0 border-b-0 rounded-b-none" : ""}`}
                  style={{ 
                    padding: cardPaddingStyle,
                    ...( !isFirst ? { paddingTop: 0 } : {} ),
                    ...( !isLast ? { paddingBottom: 0 } : {} )
                  }}"""
                  
    replacement2 = """                  className={`transition-all rounded-xl border ${colorClass} shadow-3xs break-inside-auto print:orphans-4 print:widows-4 print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0 ${!isFirst ? "mt-0 pt-0 border-t-0 rounded-t-none" : ""} ${!isLast ? "mb-0 pb-0 border-b-0 rounded-b-none" : ""}`}
                  style={{ 
                    padding: cardPaddingStyle,
                    ...( !isFirst ? { paddingTop: 0, marginTop: `-${activeTemplate.typography?.cardSpacing ?? (activeTemplate.typography?.questionSpacing ?? 16)}px` } : {} ),
                    ...( !isLast ? { paddingBottom: 0 } : {} )
                  }}"""
                  
    code = code.replace(target2, replacement2)
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced successfully!")
else:
    print("Target not found.")
