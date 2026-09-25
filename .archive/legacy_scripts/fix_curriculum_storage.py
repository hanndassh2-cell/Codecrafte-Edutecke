with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { Subject, Unit, Lesson } from "../../../types/index";', 'import { Subject, Unit, Lesson } from "../../../types/index";\nimport { storage } from "../../../services/storage";')

with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
