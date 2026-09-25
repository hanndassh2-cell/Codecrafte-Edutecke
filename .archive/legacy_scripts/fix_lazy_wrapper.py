import re

with open('src/modules/questions/pages/QuestionBankView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find <LazyQuestionWrapper><QuestionRenderer ... /> and add closing tag
content = re.sub(r'(<LazyQuestionWrapper><QuestionRenderer[\s\S]*?/>)', r'\1</LazyQuestionWrapper>', content)

with open('src/modules/questions/pages/QuestionBankView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
