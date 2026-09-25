with open("src/modules/lessons/pages/LessonEditorView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

if "import { StatusBar }" not in content:
    content = content.replace(
        'import { PreviewPanel } from "../../editor/components/PreviewPanel";',
        'import { PreviewPanel } from "../../editor/components/PreviewPanel";\nimport { StatusBar } from "../../editor/components/StatusBar";\nimport { MediaLibraryPanel } from "../../editor/components/MediaLibraryPanel";'
    )

if "const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);" not in content:
    content = content.replace(
        'const [isFullscreen, setIsFullscreen] = useState(false);',
        'const [isFullscreen, setIsFullscreen] = useState(false);\n  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);'
    )

new_footer = """      {/* Media Library */}
      <MediaLibraryPanel isOpen={isMediaLibraryOpen} onClose={() => setIsMediaLibraryOpen(false)} />
      </div>

      <StatusBar 
        wordCount={paragraphs.reduce((acc, p) => acc + (p.body?.split(/\\s+/).filter(Boolean).length || 0), 0)}
        charCount={paragraphs.reduce((acc, p) => acc + (p.body?.length || 0), 0)}
        cardCount={paragraphs.length}
        pageCount={Math.max(1, Math.ceil(paragraphs.length / 3))}
        lastSaved={new Date().toLocaleTimeString("ar-EG")}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
      />
    </div>
"""

# Find the footer
match = re.search(r'      \{/\* Footer / Status Bar \*/\}.*?    </div>\n    </div>', content, flags=re.DOTALL)
if match:
    content = content[:match.start()] + new_footer + content[match.end():]
else:
    print("Footer not found")

with open("src/modules/lessons/pages/LessonEditorView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
