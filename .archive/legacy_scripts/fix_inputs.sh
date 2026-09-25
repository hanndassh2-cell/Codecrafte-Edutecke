#!/bin/bash
sed -i 's/<div className="w-full min-h-\[80px\] bg-white dark:bg-slate-900 border rounded"><RichTextEditor onFocus={setActiveEditor}\s*type="number"/<input type="number"/' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/<div className="w-full min-h-\[80px\] bg-white dark:bg-slate-900 border rounded"><RichTextEditor onFocus={setActiveEditor}\s*type="checkbox"/<input type="checkbox"/' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/<div className="w-full min-h-\[80px\] bg-white dark:bg-slate-900 border rounded"><RichTextEditor onFocus={setActiveEditor}\s*placeholder="أدخل معلومات الدورة (مثال: دورة 2024 الفصل الأول)..."/<input type="text" placeholder="أدخل معلومات الدورة (مثال: دورة 2024 الفصل الأول)..."/' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/onChange={(e) =>/onChange={(e) => /' src/modules/questions/pages/QuestionEditorPage.tsx

