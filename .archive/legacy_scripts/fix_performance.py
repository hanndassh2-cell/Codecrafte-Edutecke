import re

with open("src/modules/editor/components/EditorCard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "export const EditorCard = React.memo" not in content:
    content = content.replace(
        "export const EditorCard = ({",
        "export const EditorCard = React.memo(({"
    )
    content = content.replace(
        "  );\n};\n",
        "  );\n});\n"
    )

with open("src/modules/editor/components/EditorCard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
