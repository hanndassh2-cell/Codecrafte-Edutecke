import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add framer-motion import
if "import { motion, AnimatePresence } from" not in content:
    content = content.replace('import React, { useState } from "react";', 'import React, { useState } from "react";\nimport { motion, AnimatePresence } from "motion/react";')

# Replace paragraphs map with AnimatePresence
old_map = """      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-w-4xl mx-auto w-full pb-32">
        {paragraphs.map((p, index) => {"""

new_map = """      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-w-4xl mx-auto w-full pb-32">
        <AnimatePresence initial={false}>
        {paragraphs.map((p, index) => {"""

content = content.replace(old_map, new_map)

# Replace React.Fragment with motion.div
old_fragment = """          return (
            <React.Fragment key={p.id}>
              <EditorCard"""

new_fragment = """          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <EditorCard"""

content = content.replace(old_fragment, new_fragment)

old_close_fragment = """                {inlineAddIndex === index && ("""

new_close_fragment = """                {inlineAddIndex === index && ("""

# Actually let's just search for </React.Fragment> and replace with </motion.div>
content = content.replace("            </React.Fragment>", "            </motion.div>")

# And wrap the end of paragraphs map
old_end_map = """          );
        })}"""

new_end_map = """          );
        })}
        </AnimatePresence>"""

content = content.replace(old_end_map, new_end_map)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
