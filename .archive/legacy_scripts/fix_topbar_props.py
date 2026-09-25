import re

with open("src/modules/editor/components/TopBar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "onExportWord,\n  onImportWord,\n}: {",
    "onExportWord,\n  onImportWord,\n  isSaving,\n}: {"
)

with open("src/modules/editor/components/TopBar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
