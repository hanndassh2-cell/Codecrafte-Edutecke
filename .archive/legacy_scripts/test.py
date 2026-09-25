with open('src/index.css', 'a', encoding='utf-8') as f:
    f.write("""
/* PREVENT STRETCHING */
.a4-print-sheet p {
  display: inline;
}

.a4-print-sheet .katex-display {
  display: inline-block;
  vertical-align: middle;
}
""")
print("Done")
