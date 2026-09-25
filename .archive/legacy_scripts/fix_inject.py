import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

if "function splitHtmlIntoBlocks" not in code:
    helper = """
function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
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
    code = code.replace('export const PreviewPanel', helper + '\nexport const PreviewPanel')
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Injected helper successfully.")

