import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's see exactly how activeParagraphId is declared
if "const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);" not in content:
    content = content.replace(
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(\n    null,\n  );",
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(\n    null,\n  );\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);"
    )
    
    # Try another variation
    content = content.replace(
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(\n    null\n  );",
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(\n    null\n  );\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);"
    )

    # Let's just do a regex replace after the exact string
    content = re.sub(
        r"const \[activeParagraphId, setActiveParagraphId\] = useState<string \| null>\([\s\S]*?\);",
        lambda m: m.group(0) + "\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);",
        content
    )


with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
