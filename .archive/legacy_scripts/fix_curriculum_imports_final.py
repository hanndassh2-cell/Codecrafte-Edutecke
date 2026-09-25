with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
lucide_imports = re.search(r'import \{([\s\S]*?)\} from "lucide-react";', content)
if lucide_imports:
    imports_str = lucide_imports.group(1)
    for icon in ['Link', 'Loader2', 'AlertTriangle', 'CheckCircle']:
        if f' {icon},' not in imports_str and f'\n  {icon},' not in imports_str:
            imports_str += f',\n  {icon}'
    
    content = content[:lucide_imports.start(1)] + imports_str + content[lucide_imports.end(1):]

with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
