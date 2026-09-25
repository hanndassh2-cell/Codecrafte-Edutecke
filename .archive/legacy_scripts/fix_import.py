import re

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the incorrect import injection
code = code.replace('import { Selection } from "prosemirror-state";\n\nfunction buildMathDecorations', 'function buildMathDecorations')

# Add Selection to existing @tiptap/pm/state import
code = re.sub(r'import\s*{\s*Plugin,\s*PluginKey,\s*TextSelection\s*}\s*from\s*"@tiptap/pm/state";', 'import { Plugin, PluginKey, TextSelection, Selection } from "@tiptap/pm/state";', code)

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed imports")
