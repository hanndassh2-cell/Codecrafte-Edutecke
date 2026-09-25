function splitHtmlIntoBlocks(html) {
  if (!html) return [];
  if (typeof document === 'undefined') {
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    global.document = new JSDOM().window.document;
  }
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const blocks = [];
  Array.from(div.children).forEach(child => {
    // If it's a very long paragraph with BRs, split it!
    if (child.tagName === 'P' && child.innerHTML.includes('<br>')) {
        // ... logic
    }
    blocks.push(child.outerHTML);
  });
  
  return blocks.length > 0 ? blocks : [html];
}
