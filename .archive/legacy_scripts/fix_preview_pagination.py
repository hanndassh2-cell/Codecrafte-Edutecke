import re

with open("src/modules/editor/components/PreviewPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update next/prev page by 2 if double mode
content = content.replace(
    "onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}",
    "onClick={() => setCurrentPage(Math.max(1, currentPage - (viewMode === 'double' ? 2 : 1)))}"
)

content = content.replace(
    "onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}",
    "onClick={() => setCurrentPage(Math.min(totalPages, currentPage + (viewMode === 'double' ? 2 : 1)))}"
)

with open("src/modules/editor/components/PreviewPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
