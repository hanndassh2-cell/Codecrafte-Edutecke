import re

with open('src/modules/editor/components/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Make Image inline: false
code = code.replace(
    'CustomImage.configure({ inline: true, allowBase64: true }),',
    'CustomImage.configure({ inline: false, allowBase64: true }),'
)
code = code.replace(
    'TextAlign.configure({ types: ["heading", "paragraph"] }),',
    'TextAlign.configure({ types: ["heading", "paragraph", "image"] }),'
)

with open('src/modules/editor/components/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated to inline: false")
