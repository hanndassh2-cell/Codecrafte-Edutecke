import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add a state for editorZoom
if "editorZoom" not in content:
    content = content.replace("const [isSaving, setIsSaving] = useState(false);", "const [isSaving, setIsSaving] = useState(false);\n  const [editorZoom, setEditorZoom] = useState(1);")

status_bar_code = """      {/* Footer / Status Bar */}
      <div className="h-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 text-[11px] font-bold text-slate-500 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span>{paragraphs.length} بطاقة</span>
          <span>{paragraphs.reduce((acc, p) => acc + (p.body?.split(/\\s+/).filter(Boolean).length || 0), 0)} كلمة</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={isSaving ? "text-amber-500 animate-pulse" : "text-green-500"}>
              {isSaving ? "جاري الحفظ..." : "تم الحفظ بنجاح"}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditorZoom(Math.max(0.5, editorZoom - 0.1))} className="hover:text-blue-500">-</button>
            <span>{Math.round(editorZoom * 100)}%</span>
            <button onClick={() => setEditorZoom(Math.min(1.5, editorZoom + 0.1))} className="hover:text-blue-500">+</button>
          </div>
        </div>
      </div>
    </div>
  );
};"""

old_end = """      </div>
    </div>
  );
};"""

content = content.replace(old_end, status_bar_code)

# Apply editorZoom to EditorPanel's container
editor_panel = """        <div className="flex-1 relative bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden">
          <EditorPanel"""

editor_panel_zoomed = """        <div className="flex-1 relative bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden custom-scrollbar">
          <div style={{ transform: `scale(${editorZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s', height: `${100 / editorZoom}%` }} className="h-full">
            <EditorPanel"""

# Also close the extra div for EditorPanel
content = content.replace(editor_panel, editor_panel_zoomed)
content = content.replace("/>\n        </div>\n\n        {/* Preview Panel */}", "/>\n          </div>\n        </div>\n\n        {/* Preview Panel */}")

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
