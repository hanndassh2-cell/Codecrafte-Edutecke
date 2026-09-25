#!/bin/bash
sed -i 's/<input/ <div className="w-full min-h-[80px] bg-white dark:bg-slate-900 border rounded"><RichTextEditor onFocus={setActiveEditor}/' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/type="text"//' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/onChange={(e) => {/onChange={(val) => {/' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/next\[idx\].text = e.target.value;/next[idx].text = val;/' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/className="w-full p-1 bg-transparent border-0 focus:outline-none text-slate-900 dark:text-slate-100 font-bold text-xs"/ \/><\/div>/' src/modules/questions/pages/QuestionEditorPage.tsx

