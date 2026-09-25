import re

with open("src/modules/editor/components/PreviewPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add state for current page and total pages
if "const [currentPage, setCurrentPage]" not in content:
    content = content.replace(
        "import React from \"react\";\nimport { ZoomIn, ZoomOut, Maximize2, Printer } from \"lucide-react\";",
        "import React, { useState } from \"react\";\nimport { ZoomIn, ZoomOut, Maximize2, Printer, ChevronRight, ChevronLeft } from \"lucide-react\";"
    )

    content = content.replace(
        "  setIsFullscreen: (b: boolean) => void;\n}) => {",
        """  setIsFullscreen: (b: boolean) => void;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
"""
    )
    
    # Add pagination controls next to zoom
    old_zoom_controls = """          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-8 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1 rounded transition ${isFullscreen ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title={isFullscreen ? "تصغير الشاشة" : "ملء الشاشة"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>"""

    new_zoom_controls = """          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 min-w-[3rem] text-center" dir="ltr">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-8 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
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

    # Pass onPagesChange to PaginatedA4Preview
    content = content.replace(
        "<PaginatedA4Preview",
        "<PaginatedA4Preview\n            currentPageIndex={currentPage - 1}\n            onPagesChange={(count) => {\n              setTotalPages(count);\n              if (currentPage > count) setCurrentPage(count || 1);\n            }}"
    )

with open("src/modules/editor/components/PreviewPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
