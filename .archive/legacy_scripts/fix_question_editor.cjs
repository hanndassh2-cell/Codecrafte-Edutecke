const fs = require('fs');
const file = 'src/modules/questions/pages/QuestionEditorPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the control from its current position
const formControlStr = `                    <div className="mt-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
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
                    </div>`;

if (code.includes(formControlStr)) {
    code = code.replace(formControlStr, "");
}

// 2. Insert it inside the card header
const livePreviewHeaderTarget = `                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>المعاينة الحية لبطاقة السؤال (Live Sheet Preview)</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold">
                    A4 Card Sheet
                  </span>
                </div>`;

const newLivePreviewHeader = `                <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>المعاينة الحية لبطاقة السؤال (Live Sheet Preview)</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold">
                      A4 Card Sheet
                    </span>
                  </div>
                  
                  {/* Card Line Spacing Control (In Card) */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <label className="text-slate-600 dark:text-slate-400 font-bold text-[10px] whitespace-nowrap">
                      تباعد الأسطر بالبطاقة:
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={formLineSpacing}
                      onChange={(e) => setFormLineSpacing(Number(e.target.value))}
                      className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold w-6 text-center">
                      {formLineSpacing}
                    </span>
                  </div>
                </div>`;

if (code.includes(livePreviewHeaderTarget)) {
    code = code.replace(livePreviewHeaderTarget, newLivePreviewHeader);
    fs.writeFileSync(file, code);
    console.log('Successfully moved lineSpacing to the card preview in QuestionEditorPage');
} else {
    console.log('Target string for preview header not found');
}
