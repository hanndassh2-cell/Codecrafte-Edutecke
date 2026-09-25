import re

with open('src/modules/editor/components/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove the custom align attribute
code = re.sub(r'align: \{[\s\S]*?\},', '', code)

with open('src/modules/editor/components/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Removed custom align attribute")
