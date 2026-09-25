import re

with open("src/modules/editor/components/NavigationPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

bad_string = """      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {activeTab === "tree" && units.map((unit) => {

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {units.map((unit) => {"""

good_string = """      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {activeTab === "tree" && units.map((unit) => {"""

content = content.replace(bad_string, good_string)

with open("src/modules/editor/components/NavigationPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
