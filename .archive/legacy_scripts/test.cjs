const { JSDOM } = require("jsdom");
global.document = new JSDOM().window.document;

function splitHtmlIntoBlocks(html) {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // If there's no children, wrap it in a <p>
  if (div.children.length === 0 && div.textContent.trim().length > 0) {
      const p = document.createElement('p');
      p.innerHTML = html;
      div.innerHTML = '';
      div.appendChild(p);
  }

  const blocks = [];
  Array.from(div.children).forEach(child => {
    if (child.tagName === 'P') {
      let parts = [child.innerHTML];
      
      if (child.innerHTML.includes('<br')) {
        parts = child.innerHTML.split(/<br\s*\/?>/i);
      }
      
      const finalParts = [];
      parts.forEach(part => {
        if (part.length > 300 && !part.includes('<img') && !part.includes('<table')) {
          const sentences = part.split(/(?<=[.؟!؟])\s+(?=[^<]*$)/);
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
    } else {
      blocks.push(child.outerHTML);
    }
  });
  
  return blocks.length > 0 ? blocks : [html];
}

console.log(splitHtmlIntoBlocks("هذا نص طويل. ".repeat(40)));
