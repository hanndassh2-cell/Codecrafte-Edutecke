import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add showToast state
if "const [showToast, setShowToast] = useState(false);" not in content:
    content = content.replace(
        "const [isSaving, setIsSaving] = useState(false);",
        "const [isSaving, setIsSaving] = useState(false);\n  const [showToast, setShowToast] = useState(false);"
    )

content = content.replace(
    "// Optional: show a toast here if we had a toast system",
    "setShowToast(true);\n      setTimeout(() => setShowToast(false), 3000);"
)

if "تم حفظ الدرس بنجاح" not in content:
    content = content.replace(
        "<SplitWorkspaceLayout",
        """{showToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold">تم الحفظ بنجاح</span>
        </div>
      )}
      <SplitWorkspaceLayout"""
    )
    
if "CheckCircle2" not in content:
    content = content.replace("LayoutDashboard,", "LayoutDashboard,\n  CheckCircle2,")

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
