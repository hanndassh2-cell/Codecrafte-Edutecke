import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add a mock selectedParagraphId for the outline for now if we can't easily lift state. 
# Or we can just pass paragraphs.

new_nav = """<NavigationPanel
            units={units.filter((u) => u.subjectId === currentSubject?.id)}
            lessons={lessons}
            selectedUnitId={selectedUnitId}
            selectedLessonId={selectedLessonId}
            onSelectLesson={onChangeLesson}
            onAddUnit={() => showToast("تم إضافة وحدة جديدة")}
            onAddLesson={() => showToast("تم إضافة درس جديد")}
            onDeleteLesson={() => showToast("تم حذف الدرس")}
            paragraphs={paragraphs}
          />"""

content = re.sub(r"<NavigationPanel[\s\S]*?\/>", new_nav, content)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
