import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);",
    "const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);"
)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
