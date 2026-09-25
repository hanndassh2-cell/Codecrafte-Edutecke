with open("src/index.css", "r", encoding="utf-8") as f:
    content = f.read()

font_import = "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap');\n"
base_styles = """
@layer base {
  body {
    font-family: 'Cairo', sans-serif;
  }
}
"""

if "fonts.googleapis.com" not in content:
    content = font_import + content + base_styles
    with open("src/index.css", "w", encoding="utf-8") as f:
        f.write(content)
