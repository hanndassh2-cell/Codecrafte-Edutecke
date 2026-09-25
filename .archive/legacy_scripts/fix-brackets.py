with open('src/modules/editor/components/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == "addNodeView() {":
        # Check if previous lines closed the addAttributes
        if "}" not in lines[i-1]:
            lines.insert(i, "    };\n  },\n")
            break

with open('src/modules/editor/components/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
