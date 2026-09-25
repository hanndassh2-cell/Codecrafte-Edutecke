#!/bin/bash
# Remove internal ribbon states from EditorPanel.tsx
sed -i '/const \[showFileMenuDropdown, setShowFileMenuDropdown\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const fileMenuRef = useRef<HTMLDivElement>(null);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const mathMenuRef = useRef<HTMLDivElement>(null);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const cardMenuRef = useRef<HTMLDivElement>(null);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const questionMenuRef = useRef<HTMLDivElement>(null);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[isBulletMenuOpen, setIsBulletMenuOpen\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showTextColorPopover, setShowTextColorPopover\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showHighlightPopover, setShowHighlightPopover\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showMathPopover, setShowMathPopover\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showChemPopover, setShowChemPopover\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showQuestionDropdown, setShowQuestionDropdown\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showNewCardDropdown, setShowNewCardDropdown\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showTablePopover, setShowTablePopover\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showCellBgPopover, setShowCellBgPopover\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showHeadingDropdown, setShowHeadingDropdown\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx
sed -i '/const \[showAiDropdown, setShowAiDropdown\] = useState(false);/d' src/modules/editor/components/EditorPanel.tsx

# Find lines to delete
START_LINE=$(grep -n "Ribbon Header Tabs (Unified Single Row)" src/modules/editor/components/EditorPanel.tsx | cut -d: -f1)
END_LINE=$(grep -n "Editor Content Workspace Area" src/modules/editor/components/EditorPanel.tsx | cut -d: -f1)

# we want to delete from line containing <div className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shrink-0 z-[100] shadow-sm sticky top-0 overflow-visible relative">
# to the line before Editor Content Workspace Area which is )}

sed -i "${START_LINE},${END_LINE}c\
      <EditorRibbon\
        activeRibbonTab={activeRibbonTab as any}\
        setActiveRibbonTab={setActiveRibbonTab}\
        activeEditor={activeEditor}\
        paragraphs={paragraphs}\
        setParagraphs={setParagraphs}\
        setActiveParagraphId={setActiveParagraphId}\
        setActiveMainTab={setActiveMainTab}\
        onSave={onSave}\
        lastSaved={lastSaved}\
        onPreview={onPreview}\
        onExportWord={onExportWord}\
        onExportPdf={onExportPdf}\
        onPrint={onPrint}\
        setIsImageModalOpen={setIsImageModalOpen}\
        setIsTableModalOpen={setIsTableModalOpen}\
        setIsLinkModalOpen={setIsLinkModalOpen}\
        isDistributorProcessing={isDistributorProcessing}\
        setIsDistributorProcessing={setIsDistributorProcessing}\
        setIsDistributorOpen={setIsDistributorOpen}\
        isFocusReadingMode={isFocusReadingMode}\
        setIsFocusReadingMode={setIsFocusReadingMode}\
        isNavCollapsed={isNavCollapsed}\
        onToggleNav={onToggleNav}\
        isPreviewCollapsed={isPreviewCollapsed}\
        onTogglePreview={onTogglePreview}\
        showRuler={showRuler}\
        setShowRuler={setShowRuler}\
        setIsRulerModalOpen={setIsRulerModalOpen}\
        zoomLevel={zoomLevel}\
        setZoomLevel={setZoomLevel}\
        setIsAiAssistantOpen={setIsAiAssistantOpen}\
        setIsQuickPasteModalOpen={setIsQuickPasteModalOpen}\
        setIsQuestionParserOpen={setIsQuestionParserOpen}\
        setIsQuestionHubOpen={setIsQuestionHubOpen}\
        setQuestionHubTab={setQuestionHubTab}\
      />\
      )}\
      {/* Editor Content Workspace Area (Word A4 Canvas) */}\
" src/modules/editor/components/EditorPanel.tsx

# Delete the extra div wrapper line before START_LINE
sed -i '/<div className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shrink-0 z-\[100\] shadow-sm sticky top-0 overflow-visible relative">/d' src/modules/editor/components/EditorPanel.tsx

# Add import for EditorRibbon
sed -i 's/import { RichTextEditor, processSmartPaste } from "\.\/RichTextEditor";/import { RichTextEditor, processSmartPaste } from ".\/RichTextEditor";\nimport { EditorRibbon } from ".\/EditorRibbon";/' src/modules/editor/components/EditorPanel.tsx

