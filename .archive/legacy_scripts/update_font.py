import re

with open("src/index.css", "r", encoding="utf-8") as f:
    content = f.read()

font_import = "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap');\n\n"

if "fonts.googleapis.com" not in content:
    content = content.replace(
        "@import \"tailwindcss\";\n\n@plugin \"@tailwindcss/typography\";\n\n@variant dark (&:where(.dark, .dark *));",
        "@import \"tailwindcss\";\n\n@plugin \"@tailwindcss/typography\";\n\n@variant dark (&:where(.dark, .dark *));\n\n" + font_import + """
@layer base {
  body {
    font-family: 'Cairo', 'Tajawal', sans-serif;
  }
}
"""
    )
    with open("src/index.css", "w", encoding="utf-8") as f:
        f.write(content)
