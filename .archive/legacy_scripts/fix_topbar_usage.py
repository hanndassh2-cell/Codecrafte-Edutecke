with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '        onImportWord={() => showToast("تم فتح نافذة استيراد Word")}',
    '        onImportWord={() => showToast("تم فتح نافذة استيراد Word")}\n        onToggleMediaLibrary={() => setIsMediaLibraryOpen(!isMediaLibraryOpen)}\n        isMediaLibraryOpen={isMediaLibraryOpen}'
)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
