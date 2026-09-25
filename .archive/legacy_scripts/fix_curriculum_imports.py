import re
with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

missing_icons = ['CheckCircle', 'AlertTriangle', 'X', 'Loader2', 'Link']
for icon in missing_icons:
    if f'{icon},' not in content and f'{icon} }}' not in content:
        content = content.replace('Search,', f'Search,\n  {icon},')

with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
