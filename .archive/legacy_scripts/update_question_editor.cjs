const fs = require('fs');
const file = 'src/modules/questions/pages/QuestionEditorPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden min-h-[220px] bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
                      <RichTextEditor
                        value={formText}
                        onChange={(val) => setFormText(val)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        placeholder="أدخل نص السؤال هنا... يمكنك إضافة رموز ومعادلات كيميائية/رياضية وإدراج جداول وصور مباشرة"
                      />
                    </div>
                  </div>`;

const replacementStr = `                    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden min-h-[220px] bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
                      <RichTextEditor
                        value={formText}
                        onChange={(val) => setFormText(val)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        placeholder="أدخل نص السؤال هنا... يمكنك إضافة رموز ومعادلات كيميائية/رياضية وإدراج جداول وصور مباشرة"
                      />
                    </div>
                    
                    <div className="mt-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                          تباعد الأسطر داخل البطاقة (px)
                        </label>
                        <span className="text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold">
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
                          onChange={(e) => setFormLineSpacing(Number(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormLineSpacing(0)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          title="إعادة التعيين (0)"
                        >
                          إعادة (0)
                        </button>
                      </div>
                    </div>
                  </div>`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync(file, code);
    console.log('Added lineSpacing UI to QuestionEditorPage.tsx');
} else {
    console.log('Target string not found in QuestionEditorPage.tsx');
}
