import re

with open('src/components/MathText.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Instead of changing to inline in React which might break the katex layout entirely, 
# let's try just completely zeroing out margin everywhere in print mode using generic class matches
with open('src/index.css', 'a', encoding='utf-8') as f:
    f.write("""
/* NUCLEAR WEAPON OPTION FOR MARGINS */
@media print {
  .a4-print-sheet [class*="math-"],
  .a4-print-sheet [class*="katex"] {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
}
""")
