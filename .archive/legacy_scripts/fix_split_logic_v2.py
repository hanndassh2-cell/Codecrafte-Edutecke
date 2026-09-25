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

replacement = """function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {
    if (child.tagName === 'P') {
      let parts: string[] = [child.innerHTML];
      
      // 1. Split by <br> tags
      if (child.innerHTML.includes('<br')) {
        parts = child.innerHTML.split(/<br\\s*\\/?>/i);
      }
      
      // 2. Further split very long text chunks by sentences (period, question mark, exclamation mark followed by space)
      const finalParts: string[] = [];
      parts.forEach(part => {
        if (part.length > 300 && !part.includes('<img') && !part.includes('<table')) {
          // Attempt to split by Arabic or English sentence endings, preserving the punctuation
          const sentences = part.split(/(?<=[.؟!؟])\\s+(?=[^<]*$)/);
          let currentChunk = "";
          sentences.forEach(sentence => {
            if (currentChunk.length + sentence.length > 300) {
              if (currentChunk) finalParts.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += (currentChunk ? " " : "") + sentence;
            }
          });
          if (currentChunk) finalParts.push(currentChunk.trim());
        } else {
          finalParts.push(part.trim());
        }
      });
      
      finalParts.forEach(part => {
        if (part) {
          const newP = document.createElement('p');
          newP.innerHTML = part;
          Array.from(child.attributes).forEach(attr => {
            newP.setAttribute(attr.name, attr.value);
          });
          blocks.push(newP.outerHTML);
        }
      });
    } else if (child.tagName === 'UL' || child.tagName === 'OL') {
        // Split lists if they have many items
        const listItems = Array.from(child.children);
        if (listItems.length > 3) {
            let currentList = document.createElement(child.tagName);
            Array.from(child.attributes).forEach(attr => currentList.setAttribute(attr.name, attr.value));
            
            listItems.forEach((li, idx) => {
                currentList.appendChild(li.cloneNode(true));
                if (currentList.children.length >= 3 || idx === listItems.length - 1) {
                    blocks.push(currentList.outerHTML);
                    currentList = document.createElement(child.tagName);
                    Array.from(child.attributes).forEach(attr => currentList.setAttribute(attr.name, attr.value));
                }
            });
        } else {
            blocks.push(child.outerHTML);
        }
    } else {
      blocks.push(child.outerHTML);
    }
  });
  
  return blocks.length > 0 ? blocks : [html];
}"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/modules/editor/components/PreviewPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Injected advanced split logic.")
else:
    print("Target not found.")
