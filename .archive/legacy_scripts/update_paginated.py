import re

with open("src/components/PaginatedA4Preview.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add onPagesChange to props
if "onPagesChange?:" not in content:
    content = content.replace(
        "className?: string;",
        "className?: string;\n  onPagesChange?: (pagesCount: number) => void;\n  currentPageIndex?: number;"
    )

    content = content.replace(
        "className = \"\",\n}:",
        "className = \"\",\n  onPagesChange,\n  currentPageIndex,\n}:"
    )

    # Call onPagesChange when pages change
    content = content.replace(
        "setPages(currentPages.length > 0 ? currentPages : [items]);",
        "const newPages = currentPages.length > 0 ? currentPages : [items];\n      setPages(newPages);\n      if (onPagesChange) onPagesChange(newPages.length);"
    )
    
    # Render only currentPageIndex if provided
    content = content.replace(
        "{pages.map((pageItems, pageIdx) => (",
        """{pages.map((pageItems, pageIdx) => {
        if (currentPageIndex !== undefined && currentPageIndex !== pageIdx) return null;
        return ("""
    )
    content = content.replace(
        "          {pageItems.map((item) => (\n            <div key={item.id}>{item.content}</div>\n          ))}\n        </PageWrapper>\n      ))}",
        "          {pageItems.map((item) => (\n            <div key={item.id}>{item.content}</div>\n          ))}\n        </PageWrapper>\n      );\n      })}"
    )

with open("src/components/PaginatedA4Preview.tsx", "w", encoding="utf-8") as f:
    f.write(content)
