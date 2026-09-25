#!/bin/bash
sed -i 's/setQuestionHubTab?: (tab: any) => void;/setQuestionHubTab?: (tab: any) => void; onImportWord?: () => void; isSaving?: boolean; onBack?: () => void; onToggleMediaLibrary?: () => void; isMediaLibraryOpen?: boolean;/' src/modules/editor/components/EditorRibbon.tsx

sed -i 's/setQuestionHubTab$/setQuestionHubTab, onImportWord, isSaving, onBack, onToggleMediaLibrary, isMediaLibraryOpen/' src/modules/editor/components/EditorRibbon.tsx
