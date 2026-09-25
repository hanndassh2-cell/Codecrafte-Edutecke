with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Add imports for MediaLibraryPanel and Library icon
if "MediaLibraryPanel" not in content:
    content = content.replace(
        'import { PreviewPanel } from "../../editor/components/PreviewPanel";',
        'import { PreviewPanel } from "../../editor/components/PreviewPanel";\nimport { MediaLibraryPanel } from "../../editor/components/MediaLibraryPanel";'
    )

if "Library" not in content:
    content = content.replace(
        'import {',
        'import {\n  Library,'
    )

# Add state for media library
if "const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);" not in content:
    content = content.replace(
        'const [activeMainTab, setActiveMainTab] = useState<',
        'const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);\n  const [activeMainTab, setActiveMainTab] = useState<'
    )

# Replace the media tab button in the TopBar (if any) or add it.
# Actually, the user can toggle the media library from somewhere, like a button on the top right.
# Let's find `<div className="flex-1 flex overflow-hidden relative">`
# and insert `<MediaLibraryPanel />` before the closing div, after EditorArea.

new_structure = """      <div className="flex-1 flex overflow-hidden relative">
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
            <div className="h-full bg-slate-50 p-8 flex items-center justify-center">
               Template settings placeholder
            </div>
          ) : (
             <div className="h-full bg-slate-50 p-8 flex items-center justify-center">
               Questions placeholder
            </div>
          )}
          
          <button 
            onClick={() => setIsMediaLibraryOpen(!isMediaLibraryOpen)}
            className={`absolute top-4 left-4 p-2 rounded-lg shadow-md border ${isMediaLibraryOpen ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            title="مكتبة الوسائط"
          >
            <Library className="w-5 h-5" />
          </button>
        </div>
        
        <MediaLibraryPanel isOpen={isMediaLibraryOpen} onClose={() => setIsMediaLibraryOpen(false)} />
      </div>"""

# Replace the inner flex area in the render
# Let's use regex to find `<div className="flex-1 flex overflow-hidden relative">` until `</div>` that closes it.
# It's better to just replace the whole main structure.

match = re.search(r'      <div className="flex-1 flex overflow-hidden relative">.*?      </div>', content, re.DOTALL)
if match:
    pass
    # We will need to be careful with the outer </div>. Wait, the main return of LessonEditorView is:
    # return (
    #   <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans" dir="rtl">
    #     <TopBar ... />
    #     <div className="flex-1 flex overflow-hidden relative">...</div>
    #   </div>
    # )

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
