import re

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix buildMathDecorations signature
code = code.replace(
    'function buildMathDecorations(\n  doc: Node,\n  options: TipTapMathOptions,\n  getView: () => EditorView | null\n) {',
    'import { Selection } from "prosemirror-state";\n\nfunction buildMathDecorations(\n  doc: Node,\n  options: TipTapMathOptions,\n  getView: () => EditorView | null,\n  selection?: Selection\n) {'
)

# Apply selection style
target_widget = """      // Inherit inline styles"""
replacement_widget = """      // Highlight if selected
      const isSelected = selection && Math.max(selection.from, matchStart) < Math.min(selection.to, matchEnd);
      if (isSelected || (selection && selection.from <= matchStart && selection.to >= matchEnd)) {
        widgetDom.classList.add("math-selected");
        widgetDom.style.backgroundColor = "rgba(191, 219, 254, 0.7)"; // Tailwind blue-200
        widgetDom.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.5)"; // Tailwind blue-500
      }

      // Inherit inline styles"""

if target_widget in code:
    code = code.replace(target_widget, replacement_widget)

# Fix plugin init/apply
target_plugin = """        state: {
          init(_, { doc }) {
            return buildMathDecorations(doc, options, () => editorView);
          },
          apply(tr, oldSet) {
            if (!tr.docChanged) {
              return oldSet;
            }
            return buildMathDecorations(tr.doc, options, () => editorView);
          },
        },"""

replacement_plugin = """        state: {
          init(_, state) {
            return buildMathDecorations(state.doc, options, () => editorView, state.selection);
          },
          apply(tr, oldSet, oldState, newState) {
            if (!tr.docChanged && !tr.selectionSet) {
              return oldSet;
            }
            return buildMathDecorations(newState.doc, options, () => editorView, newState.selection);
          },
        },"""

if target_plugin in code:
    code = code.replace(target_plugin, replacement_plugin)

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated TipTapMathExtension.ts")
