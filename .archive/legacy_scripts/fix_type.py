with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'type: "concept" | "summary" | "exercise";',
    'type: string;'
)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
