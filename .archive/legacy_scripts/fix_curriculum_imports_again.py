with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("  Loader2,\n  AlertTriangle,\n  CheckCircle,\n", "")

with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
