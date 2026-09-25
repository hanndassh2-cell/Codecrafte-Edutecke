import re

with open("src/modules/editor/components/PreviewPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_zoom = """          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>"""

new_zoom = """          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => setZoomLevel(1.4)}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="ملاءمة العرض"
          >
            <span className="text-[10px] font-bold">↔</span>
          </button>
          <button
            onClick={() => setZoomLevel(0.7)}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="ملاءمة الصفحة"
          >
            <span className="text-[10px] font-bold">↕</span>
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>"""

content = content.replace(old_zoom, new_zoom)

with open("src/modules/editor/components/PreviewPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
