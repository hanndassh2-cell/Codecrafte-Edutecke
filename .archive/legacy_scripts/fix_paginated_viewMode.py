import re

with open("src/components/PaginatedA4Preview.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "viewMode?: 'single' | 'double';" not in content:
    content = content.replace(
        "currentPageIndex?: number;\n}",
        "currentPageIndex?: number;\n  viewMode?: 'single' | 'double';\n}"
    )
    content = content.replace(
        "  currentPageIndex,\n}) => {",
        "  currentPageIndex,\n  viewMode = 'single',\n}) => {"
    )
    
    # Change rendering loop to handle double
    old_render = """  return (
    <div className="space-y-8 print:space-y-0 print:block">
      {pages.map((pageItems, pageIdx) => {
        if (currentPageIndex !== undefined && currentPageIndex !== pageIdx) return null;
        return (
          <PageWrapper
            key={pageIdx}
            pageNumber={pageIdx + 1}
            totalPages={pages.length}
          >
            {pageItems.map((item) => (
              <div key={item.id}>{item.content}</div>
            ))}
          </PageWrapper>
        );
      })}
    </div>
  );"""

    new_render = """  return (
    <div className={`print:space-y-0 print:block ${viewMode === 'double' ? 'flex flex-row-reverse gap-8' : 'space-y-8'}`}>
      {pages.map((pageItems, pageIdx) => {
        if (currentPageIndex !== undefined) {
          if (viewMode === 'single' && currentPageIndex !== pageIdx) return null;
          if (viewMode === 'double' && (pageIdx < currentPageIndex || pageIdx > currentPageIndex + 1)) return null;
        }
        return (
          <PageWrapper
            key={pageIdx}
            pageNumber={pageIdx + 1}
            totalPages={pages.length}
            className={viewMode === 'double' ? 'transform-origin-top-right' : ''}
          >
            {pageItems.map((item) => (
              <div key={item.id}>{item.content}</div>
            ))}
          </PageWrapper>
        );
      })}
    </div>
  );"""

    content = content.replace(old_render, new_render)
    
    # also we need to add className prop to PageWrapper
    content = content.replace("const PageWrapper = ({ children, pageNumber, totalPages }: any)", "const PageWrapper = ({ children, pageNumber, totalPages, className: additionalClass }: any)")
    content = content.replace("} ${className}`}", "} ${className} ${additionalClass || ''}`}")

    with open("src/components/PaginatedA4Preview.tsx", "w", encoding="utf-8") as f:
        f.write(content)
