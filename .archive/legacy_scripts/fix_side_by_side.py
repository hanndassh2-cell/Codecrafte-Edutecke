import re

with open("src/modules/editor/components/PreviewPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add viewMode state
if "const [viewMode, setViewMode]" not in content:
    content = content.replace(
        "const [totalPages, setTotalPages] = useState(1);",
        "const [totalPages, setTotalPages] = useState(1);\n  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');"
    )

# Add Columns icon
if "Columns," not in content:
    content = content.replace("Maximize2,", "Maximize2,\n  Columns,")

# Add toggle button next to Maximize
old_zoom_controls = """          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1 rounded transition ${isFullscreen ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title={isFullscreen ? "تصغير الشاشة" : "ملء الشاشة"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>"""

new_zoom_controls = """          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'double' : 'single')}
            className={`p-1 rounded transition ${viewMode === 'double' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title="عرض صفحتين"
          >
            <Columns className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1 rounded transition ${isFullscreen ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title={isFullscreen ? "تصغير الشاشة" : "ملء الشاشة"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>"""
content = content.replace(old_zoom_controls, new_zoom_controls)

# Update PaginatedA4Preview call
old_paginated = "currentPageIndex={currentPage - 1}"
new_paginated = "currentPageIndex={currentPage - 1}\n            viewMode={viewMode}"
content = content.replace(old_paginated, new_paginated)

with open("src/modules/editor/components/PreviewPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)

