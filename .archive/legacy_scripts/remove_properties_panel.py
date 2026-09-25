with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Remove Properties Side Panel
properties_panel_regex = re.compile(r'      \{\/\* Properties Side Panel \*\/}.*?      <\/div>\n\n', re.DOTALL)
content = properties_panel_regex.sub('', content)

# Remove the other `      </div>` that was added by the previous script right before Properties Side Panel
# Actually, the previous script added:
# content = content.replace('      {/* Properties Side Panel */}', '      </div>\n\n      {/* Properties Side Panel */}')
# So there's an extra </div> we might have left, wait.

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
