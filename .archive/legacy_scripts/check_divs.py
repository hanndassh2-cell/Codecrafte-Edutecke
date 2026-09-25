with open("src/modules/editor/components/NavigationPanel.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    count += line.count("<div")
    count -= line.count("</div")
    if count < 0:
        print(f"Negative count at {i+1}: {line.strip()}")
        
print(f"Final count: {count}")
