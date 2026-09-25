import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add EditorCard import
if "import { EditorCard }" not in content:
    content = content.replace(
        'import { RichTextEditor } from "./RichTextEditor";',
        'import { RichTextEditor } from "./RichTextEditor";\nimport { EditorCard } from "./EditorCard";'
    )

# Add Plus icon to imports if not present
if " Plus," not in content:
    content = content.replace("X,", "X,\n  Plus,")

# Now update the mapping
old_mapping_regex = re.compile(r"\{paragraphs\.map\(\(p, index\) => \{.*?(?=</div\>\n\s*\}\)\}\n\s*\{\/\* Add Card Menu \*\/\}).*?</div\>\n\s*\}\)\}", re.DOTALL)

# Let's verify the exact structure to replace.
