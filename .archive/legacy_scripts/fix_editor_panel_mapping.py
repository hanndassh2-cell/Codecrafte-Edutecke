import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will find the precise string to replace
start_str = "        {paragraphs.map((p, index) => {"
end_str = "        })}\n\n        {/* Add Card Menu */}"

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str) + len("        })}")
    
    replacement = """        {paragraphs.map((p, index) => {
          const cardInfo = CARD_TYPES.find((c) => c.type === p.type) || {
            icon: FileText,
            color: "bg-slate-50 text-slate-600 border-slate-200",
          };
          const isCollapsed = collapsedCards.has(p.id);

          return (
            <React.Fragment key={p.id}>
              <EditorCard
                p={p}
                index={index}
                cardInfo={cardInfo}
                draggedIdx={draggedIdx}
                activeParagraphId={activeParagraphId}
                isCollapsed={isCollapsed}
                setActiveParagraphId={setActiveParagraphId}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDragEnd={handleDragEnd}
                updateParagraph={updateParagraph}
                toggleCollapse={toggleCollapse}
                deleteParagraph={deleteParagraph}
              />
              {/* Inline Add Menu */}
              <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity -my-2 relative z-10">
                <button 
                  onClick={() => {
                    // Quick add default card or open menu
                    // For now let's just insert a text card
                    const newId = "p-" + Date.now();
                    const newParagraphs = [...paragraphs];
                    newParagraphs.splice(index + 1, 0, {
                      id: newId,
                      title: "فقرة جديدة",
                      type: "explanation",
                      body: "",
                    });
                    setParagraphs(newParagraphs);
                    setActiveParagraphId(newId);
                  }}
                  className="bg-blue-600 text-white rounded-full p-1.5 shadow-md hover:bg-blue-700 hover:scale-110 transition-all flex items-center justify-center gap-1 pr-3"
                  title="إضافة فقرة هنا"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px] font-bold">إضافة</span>
                </button>
              </div>
            </React.Fragment>
          );
        })}"""
    
    content = content[:start_idx] + replacement + content[end_idx:]

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
