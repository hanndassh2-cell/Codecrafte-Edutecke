import re

with open("src/modules/editor/components/TopBar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "isSaving?: boolean;" not in content:
    content = content.replace(
        "  onImportWord: () => void;\n}) => {",
        "  onImportWord: () => void;\n  isSaving?: boolean;\n}) => {"
    )

    content = content.replace(
        "<Save className=\"w-4 h-4\" />\n          حفظ",
        "{isSaving ? (\n            <div className=\"w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin\"></div>\n          ) : (\n            <Save className=\"w-4 h-4\" />\n          )}\n          {isSaving ? \"جاري الحفظ...\" : \"حفظ\"}"
    )

with open("src/modules/editor/components/TopBar.tsx", "w", encoding="utf-8") as f:
    f.write(content)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content2 = f.read()

content2 = content2.replace(
    "onImportWord={() => {}}\n      />",
    "onImportWord={() => {}}\n        isSaving={isSaving}\n      />"
)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content2)
