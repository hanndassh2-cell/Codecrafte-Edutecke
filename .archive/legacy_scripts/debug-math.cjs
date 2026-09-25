const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  for (const mathEl of specialMathEls) {
    mathEl.querySelectorAll("*").forEach((n) => mathNodes.add(n));
    mathNodes.add(mathEl);
  }`;
const repl = `  for (const mathEl of specialMathEls) {
    if (mathEl.getBoundingClientRect().height > 500) {
      console.log("HUGE MATH EL:", mathEl.className, mathEl.tagName, mathEl.getBoundingClientRect());
    }
    mathEl.querySelectorAll("*").forEach((n) => mathNodes.add(n));
    mathNodes.add(mathEl);
  }`;

if (code.includes(target) && !code.includes("HUGE MATH EL")) {
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code.replace(target, repl));
  console.log("Injected log for math");
}
