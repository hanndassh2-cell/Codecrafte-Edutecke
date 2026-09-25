import re

with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the start of return (
#   <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans" dir="rtl">
# and the end.

start_str = '<div className="flex-1 flex overflow-hidden relative">'
end_str = '        <PreviewPanel'

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    new_middle = """      <div className="flex-1 flex overflow-hidden relative">
        <NavigationPanel
          units={units}
          lessons={lessons}
          selectedUnitId={selectedUnitId}
          selectedLessonId={selectedLessonId}
          onSelectLesson={(id) => {
            setSelectedLessonId(id);
            onChangeLesson?.(id);
          }}
          onAddUnit={() => {}}
          onAddLesson={() => {}}
          onDeleteLesson={() => {}}
          paragraphs={paragraphs}
          activeParagraphId={activeParagraphId}
          onSelectParagraph={setActiveParagraphId}
        />

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeMainTab === "content" ? (
            <EditorPanel
              paragraphs={paragraphs}
              setParagraphs={setParagraphs}
              activeParagraphId={activeParagraphId}
              setActiveParagraphId={setActiveParagraphId}
              isSidebarOpen={false}
              toggleSidebar={() => {}}
              onSave={handleSave}
              isSaving={isSaving}
            />
          ) : activeMainTab === "template" ? (
             <div className="h-full bg-slate-50 p-8 flex items-center justify-center">Template placeholder</div>
          ) : (
             <div className="h-full bg-slate-50 p-8 flex items-center justify-center">Questions placeholder</div>
          )}
          
          <button 
            onClick={() => setIsMediaLibraryOpen(!isMediaLibraryOpen)}
            className={`absolute top-4 left-4 p-2 rounded-lg shadow-md border z-10 transition-colors ${isMediaLibraryOpen ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            title="مكتبة الوسائط"
          >
            <Library className="w-5 h-5" />
          </button>
        </div>
        
        <MediaLibraryPanel isOpen={isMediaLibraryOpen} onClose={() => setIsMediaLibraryOpen(false)} />
      </div>

"""
    new_content = content[:start_idx] + new_middle + content[end_idx:]
    
    with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print("Could not find boundaries")
