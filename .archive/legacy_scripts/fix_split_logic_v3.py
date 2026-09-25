import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {"""

replacement = """function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // If the user pasted plain text without any tags, wrap it in a <p> tag so it gets processed
  if (div.children.length === 0 && div.textContent?.trim().length) {
    const p = document.createElement('p');
    p.innerHTML = html;
    div.innerHTML = '';
    div.appendChild(p);
  }
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Injected raw text fallback.")
else:
    print("Target not found.")
