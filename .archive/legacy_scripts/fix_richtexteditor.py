import re

with open("src/modules/editor/components/RichTextEditor.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "editor.commands.setContent(value, false);",
    "editor.commands.setContent(value, { emitUpdate: false });"
)

with open("src/modules/editor/components/RichTextEditor.tsx", "w", encoding="utf-8") as f:
    f.write(content)
