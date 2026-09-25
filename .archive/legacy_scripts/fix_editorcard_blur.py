import re

with open("src/modules/editor/components/EditorCard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "onFocus={() => setActiveParagraphId(p.id)}",
    "onFocus={() => setActiveParagraphId(p.id)}\n          onBlur={() => {}}"
)

with open("src/modules/editor/components/EditorCard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
