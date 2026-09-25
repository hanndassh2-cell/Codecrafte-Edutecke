const fs = require('fs');
const file = 'src/modules/questions/pages/QuestionEditorPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state
const statePattern = `const [formText, setFormText] = useState<string>(
    editingQuestion ? editingQuestion.text : ""
  );`;
const newState = `const [formText, setFormText] = useState<string>(
    editingQuestion ? editingQuestion.text : ""
  );
  const [formLineSpacing, setFormLineSpacing] = useState<number>(
    editingQuestion && editingQuestion.lineSpacing !== undefined ? editingQuestion.lineSpacing : 0
  );`;
code = code.replace(statePattern, newState);

// 2. Add to saved payload
const savePattern = `text: formText,
      answer: answerPayload,`;
const newSave = `text: formText,
      answer: answerPayload,
      lineSpacing: formLineSpacing,`;
code = code.replace(savePattern, newSave);

// 3. Add to preview payload
const previewPattern = `text: formText,
                          type: formType,`;
const newPreview = `text: formText,
                          type: formType,
                          lineSpacing: formLineSpacing,`;
code = code.replace(previewPattern, newPreview);

// 4. Add UI Control
const uiPattern = `{/* AI Helper Button */}`;
const newUi = `{/* Line Spacing Settings */}
                  <div className="flex flex-col gap-2 mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        تباعد الأسطر داخل البطاقة (0 = افتراضي)
                      </label>
                      <span className="text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold">
                        {formLineSpacing}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={formLineSpacing}
                        onChange={(e) => setFormLineSpacing(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="1"
                        value={formLineSpacing}
                        onChange={(e) => setFormLineSpacing(parseInt(e.target.value))}
                        className="w-16 p-1.5 text-center rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* AI Helper Button */}`;
code = code.replace(uiPattern, newUi);

fs.writeFileSync(file, code);
console.log('Patched QuestionEditorPage');
