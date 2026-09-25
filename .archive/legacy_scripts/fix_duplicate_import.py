with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
seen_media = False
for line in lines:
    if "import { MediaLibraryPanel }" in line:
        if seen_media:
            continue
        seen_media = True
    new_lines.append(line)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
