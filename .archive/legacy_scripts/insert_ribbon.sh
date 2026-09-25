#!/bin/bash
sed -i 's/<SplitWorkspaceLayout/<div className="w-full relative z-40 bg-white border-b border-slate-200 shadow-sm"><EditorRibbon activeRibbonTab={activeRibbonTab} setActiveRibbonTab={setActiveRibbonTab} activeEditor={activeEditor} setIsImageModalOpen={setIsImageModalOpen} setIsTableModalOpen={setIsTableModalOpen} setIsLinkModalOpen={setIsLinkModalOpen} \/><\/div><SplitWorkspaceLayout/' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/<QuestionTextBuilder/  <RichTextEditor onFocus={setActiveEditor}/' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/title="محرر أسطر السؤال"/placeholder="أدخل نص السؤال هنا..." /' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/title="محرر أسطر الإجابة"/placeholder="أدخل نص الإجابة هنا..." /' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/description=".*"//' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/placeholderPrefix=".*"//' src/modules/questions/pages/QuestionEditorPage.tsx
sed -i 's/collapsible={false}//' src/modules/questions/pages/QuestionEditorPage.tsx

