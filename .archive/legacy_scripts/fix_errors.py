import re

with open("src/components/PaginatedA4Preview.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "  className = \"\",\n}) => {",
    "  className = \"\",\n  onPagesChange,\n  currentPageIndex,\n}) => {"
)
with open("src/components/PaginatedA4Preview.tsx", "w", encoding="utf-8") as f:
    f.write(content)

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content2 = f.read()

if "Settings" not in content2[:1000]:
    content2 = content2.replace(
        "HelpCircle,",
        "HelpCircle,\n  Settings,\n  Copy,\n  Trash2,"
    )
    with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
        f.write(content2)

