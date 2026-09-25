import re

with open('src/modules/editor/components/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Import ImageNodeView
if "import { ImageNodeView }" not in code:
    code = code.replace(
        'import { Color } from "@tiptap/extension-color";',
        'import { Color } from "@tiptap/extension-color";\nimport { ReactNodeViewRenderer } from "@tiptap/react";\nimport { ImageNodeView } from "./ImageNodeView";'
    )

# Add addNodeView to CustomImage
custom_image_def = """const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `max-width: 100%; width: ${attributes.width};`
          };
        }
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return {
            height: attributes.height,
            style: `height: ${attributes.height};`
          };
        }
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  }
});"""

# We'll use regex to replace the existing CustomImage definition
pattern = r'const CustomImage = Image\.extend\(\{[\s\S]*?\}\);'
code = re.sub(pattern, custom_image_def, code)

with open('src/modules/editor/components/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
    
print("Updated RichTextEditor.tsx with ReactNodeViewRenderer for CustomImage")
