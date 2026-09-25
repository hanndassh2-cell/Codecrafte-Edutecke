import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const [isSaving, setIsSaving] = useState(false);\n  const [showToast, setShowToast] = useState(false);", "const [isSaving, setIsSaving] = useState(false);")

toast_ui = """{showToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold">تم الحفظ بنجاح</span>
        </div>
      )}"""

content = content.replace(toast_ui, "")

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
