import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "<TopBar",
    "<TopBar\n            isSaving={isSaving}"
)

# Update handleSave to use isSaving
old_handle_save = """  const handleSave = () => {
    if (!currentLesson) return;

    // Also save the active template so unsaved template tweaks are kept
    storage.savePrintTemplate(activeTemplate);

    const updated: Lesson = {
      ...currentLesson,
      status,
      contentParagraphs: paragraphs,
      questionIds: selectedQuestionIds,
      defaultTemplateId: activeTemplate.id,
    };
    onSaveLesson(updated);

    // Save template as default if user requested it to be standard
    // Actually we can add a new function for saving template explicitly
    showToast("تم حفظ تغييرات الدرس بنجاح!");
  };"""

new_handle_save = """  const handleSave = () => {
    if (!currentLesson) return;
    setIsSaving(true);

    setTimeout(() => {
      // Also save the active template so unsaved template tweaks are kept
      storage.savePrintTemplate(activeTemplate);

      const updated: Lesson = {
        ...currentLesson,
        status,
        contentParagraphs: paragraphs,
        questionIds: selectedQuestionIds,
        defaultTemplateId: activeTemplate.id,
      };
      onSaveLesson(updated);
      setIsSaving(false);
      showToast("تم حفظ تغييرات الدرس بنجاح!");
    }, 600);
  };
  
  // Auto save effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (paragraphs.length > 0) {
        handleSave();
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [paragraphs, selectedQuestionIds]);"""

content = content.replace(old_handle_save, new_handle_save)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
