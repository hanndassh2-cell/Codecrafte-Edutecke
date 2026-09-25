import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add EditorCard import
if "import { EditorCard }" not in content:
    content = content.replace(
        'import { RichTextEditor } from "./RichTextEditor";',
        'import { RichTextEditor } from "./RichTextEditor";\nimport { EditorCard } from "./EditorCard";'
    )

# Add Plus icon to imports
if "Plus," not in content:
    content = content.replace("GripVertical,", "GripVertical,\n  Plus,")

# Verify inlineAddIndex state
if "inlineAddIndex" not in content[:15000]: # Look near the top
    content = content.replace(
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(\n    null,\n  );",
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(\n    null,\n  );\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);"
    )
    
    # Try another variation just in case
    content = content.replace(
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);",
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);"
    )

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
