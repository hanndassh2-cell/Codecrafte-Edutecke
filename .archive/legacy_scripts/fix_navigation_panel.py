import re

with open("src/modules/editor/components/NavigationPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's see what props it currently accepts
match = re.search(r"export const NavigationPanel = \(\{([\s\S]*?)\}: \{", content)
if match:
    props = match.group(1)
    print("Props:", props)

