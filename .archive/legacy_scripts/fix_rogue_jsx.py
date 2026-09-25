with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove lines from index 459 to 585 (inclusive)
# Note: Python index is 0-based. Line 460 is index 459.
# We should double check what the exact indices are.
with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    for i, line in enumerate(lines):
        # We saw line 460 is `                <div className="flex-1 overflow-y-auto p-4 space-y-6">`
        # and line 584 is `          })()}`
        # line 585 is `      </div>`
        if 459 <= i <= 584:
            continue
        f.write(line)
