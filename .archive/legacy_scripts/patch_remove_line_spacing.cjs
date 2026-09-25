const fs = require('fs');
const file = 'src/modules/exams/pages/ExamGeneratorView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                              {/* Line Spacing control with range slider and direct numeric input */}`;
const endStr = `                                </div>\n                              </div>\n                            </div>\n                          </>\n                        )}`;

const startIdx = code.indexOf(targetStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const toReplace = code.substring(startIdx, endIdx);
    code = code.replace(toReplace, '');
    fs.writeFileSync(file, code);
    console.log('Removed global line spacing from ExamGeneratorView');
} else {
    console.log('Could not find indices', startIdx, endIdx);
}
