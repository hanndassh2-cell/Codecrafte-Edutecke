const fs = require('fs');
const file = 'src/modules/exams/pages/ExamGeneratorView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Find the section containing "تباعد الأسطر (Line Spacing)" and remove it.
const startStr = '{/* Line Spacing control with range slider and direct numeric input */}';
const startIdx = code.indexOf(startStr);
if (startIdx !== -1) {
    const endStr = '</div>';
    let endIdx = code.indexOf('</div>', startIdx);
    // Need to skip over nested divs. Let's just use regex or manual replace for the block.
    // Actually, since there are many nested divs, let's replace the whole block from 
    // `{/* Line Spacing control...` up to `step="0.05"`... wait.
}
