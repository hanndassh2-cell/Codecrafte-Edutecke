import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

shortcuts_code = """
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
          setIsSaving(false);
          showToast("تم الحفظ بنجاح");
        }, 800);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        showToast("تراجع (قيد التطوير)");
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        showToast("إعادة (قيد التطوير)");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        showToast("ابحث في المنهج (قيد التطوير)");
        // In a real app we would focus the search input in the sidebar
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        showToast("إضافة بطاقة جديدة");
        const newId = "p-" + Date.now();
        setParagraphs(prev => [...prev, {
          id: newId,
          title: "عنوان جديد",
          type: "title",
          body: ""
        }]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint]);
"""

# Insert before the return statement of LessonEditorView
content = re.sub(r"(  const handlePrint = \(\) => {[\s\S]*?};)", r"\1\n" + shortcuts_code, content)

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
