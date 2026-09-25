const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `      stage.appendChild(clonedSheet);

      // Wait for layout
      await new Promise((r) => setTimeout(r, 150));`;

const replacement = `      stage.appendChild(clonedSheet);

      // --- WORD SPLITTING LOGIC ---
      // Split all text nodes into individual words to ensure perfect wrapping and exact positioning
      const wordWalker = document.createTreeWalker(clonedSheet, NodeFilter.SHOW_TEXT, null);
      const textNodesToSplit = [];
      while (wordWalker.nextNode()) textNodesToSplit.push(wordWalker.currentNode);
      
      textNodesToSplit.forEach(node => {
        if (!node.nodeValue || !node.nodeValue.trim()) return;
        const parent = node.parentElement;
        if (!parent || parent.closest(".katex") || parent.closest("svg") || parent.tagName === "STYLE" || parent.tagName === "SCRIPT") return;
        
        const words = node.nodeValue.split(/(\\s+)/);
        if (words.length > 1) {
          const frag = document.createDocumentFragment();
          words.forEach(word => {
            if (word.trim()) {
              const span = document.createElement("span");
              span.textContent = word;
              frag.appendChild(span);
            } else {
              frag.appendChild(document.createTextNode(word));
            }
          });
          node.parentNode.replaceChild(frag, node);
        }
      });
      // ----------------------------

      // Wait for layout
      await new Promise((r) => setTimeout(r, 150));`;

if (code.includes('stage.appendChild(clonedSheet);')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Replaced successfully");
} else {
  console.log("Could not find target");
}
