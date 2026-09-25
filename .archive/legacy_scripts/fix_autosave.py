import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const [paragraphs, setParagraphs] = useState<",
    "const [isSaving, setIsSaving] = useState(false);\n  const [paragraphs, setParagraphs] = useState<"
)

old_handle_save = """  const handleSave = () => {
    const now = new Date();
    setLastSaved(
      now.toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  };"""

new_handle_save = """  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      const now = new Date();
      setLastSaved(
        now.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setIsSaving(false);
      // Optional: show a toast here if we had a toast system
    }, 600);
  };
  
  // Auto-save effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (paragraphs.length > 0) {
        handleSave();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [paragraphs, attachedQuestions]);"""

content = content.replace(old_handle_save, new_handle_save)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
