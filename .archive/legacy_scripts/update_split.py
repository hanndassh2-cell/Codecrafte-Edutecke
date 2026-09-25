import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """      if (isLargeText && p.type !== "tables") {
         blocks = splitHtmlIntoBlocks(blocks[0]);
      }"""

replacement = """      const canSplit = p.type === "explanation" || p.type === "concepts" || p.type === "objectives" || p.type === "activities" || p.type === "notes" || p.type === "examples";
      if (canSplit) {
         blocks = splitHtmlIntoBlocks(blocks[0]);
      }"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced successfully!")
else:
    print("Target not found.")

