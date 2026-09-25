import re
with open("src/types/index.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('type: "concept" | "summary" | "exercise";', 'type: string;')

with open("src/types/index.ts", "w", encoding="utf-8") as f:
    f.write(content)
