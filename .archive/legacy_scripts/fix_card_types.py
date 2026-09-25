import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "icon: HelpCircle,  Settings,  Copy,  Trash2,\n    color: \"bg-red-50 text-red-600 border-red-200\",",
    "icon: HelpCircle,\n    color: \"bg-red-50 text-red-600 border-red-200\","
)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
