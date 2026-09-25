import re

with open('src/modules/editor/components/PreviewPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {
    blocks.push(child.outerHTML);
  });
  
  return blocks.length > 0 ? blocks : [html];
}"""

replacement = """function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {
    // If it's a paragraph containing <br> tags or just a very long text, we can split it
    if (child.tagName === 'P' && child.innerHTML.includes('<br>')) {
      const parts = child.innerHTML.split(/<br\\s*\\/?>/i);
      parts.forEach(part => {
        if (part.trim()) {
          const newP = document.createElement('p');
          newP.innerHTML = part;
          // Copy attributes if any
          Array.from(child.attributes).forEach(attr => {
            newP.setAttribute(attr.name, attr.value);
          });
          blocks.push(newP.outerHTML);
        }
      });
    } else {
      blocks.push(child.outerHTML);
    }
  });
  
  return blocks.length > 0 ? blocks : [html];
}"""

code = code.replace(target, replacement)

with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Injected better split logic.")
