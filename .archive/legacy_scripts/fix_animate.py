with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 max-w-4xl mx-auto w-full">\n        {paragraphs.map((p, index) => {',
    '      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 max-w-4xl mx-auto w-full">\n        <AnimatePresence initial={false}>\n        {paragraphs.map((p, index) => {'
)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
