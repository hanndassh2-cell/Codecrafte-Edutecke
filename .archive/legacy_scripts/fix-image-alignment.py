import re

with open('src/modules/editor/components/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add align attribute to CustomImage
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
          };
        }
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          return {
            'data-align': attributes.align,
          };
        }
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  }
});"""

pattern = r'const CustomImage = Image\.extend\(\{[\s\S]*?\}\);'
code = re.sub(pattern, custom_image_def, code)

with open('src/modules/editor/components/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
    
print("Updated RichTextEditor.tsx for Image align attribute")
