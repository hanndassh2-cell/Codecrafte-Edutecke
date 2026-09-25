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

# Delete lines 944 to 2035, replace with EditorRibbon
sed -i '944,2035c\
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
' src/modules/editor/components/EditorPanel.tsx

# Add import for EditorRibbon
sed -i 's/import { RichTextEditor, processSmartPaste } from "\.\/RichTextEditor";/import { RichTextEditor, processSmartPaste } from ".\/RichTextEditor";\nimport { EditorRibbon } from ".\/EditorRibbon";/' src/modules/editor/components/EditorPanel.tsx

