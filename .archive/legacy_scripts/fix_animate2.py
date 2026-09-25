with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will just remove `</AnimatePresence>` and insert it properly.
content = content.replace("        </AnimatePresence>", "")

# Now insert <AnimatePresence> and </AnimatePresence> around the map
old_map_correct = """      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 max-w-4xl mx-auto w-full">
        {paragraphs.map((p, index) => {"""

new_map_correct = """      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 max-w-4xl mx-auto w-full">
        <AnimatePresence initial={false}>
        {paragraphs.map((p, index) => {"""

content = content.replace(old_map_correct, new_map_correct)

old_end_map_correct = """          );
        })}"""

new_end_map_correct = """          );
        })}
        </AnimatePresence>"""

content = content.replace(old_end_map_correct, new_end_map_correct)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
