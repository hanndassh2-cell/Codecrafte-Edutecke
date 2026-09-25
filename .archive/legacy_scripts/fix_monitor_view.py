with open('src/modules/settings/components/EquationMonitorView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fixAllEquations function using replace since re.sub had issues with backslashes
start_idx = content.find("const fixAllEquations = () => {")
end_idx = content.find("setEquations(updated);\n  };") + len("setEquations(updated);\n  };")

if start_idx != -1 and end_idx != -1:
    fix_logic = """const fixAllEquations = () => {
    const updated = equations.map(eq => {
      if (eq.status !== 'needs_fix') return eq;
      let repaired = eq.latex;
      repaired = repaired.replace(/\\{([^{}]+)\\\\over\\s+([^{}]+)\\}/g, '\\\\frac{$1}{$2}');
      repaired = repaired.replace(/->/g, '\\\\rightarrow');
      return {
        ...eq,
        originalLatex: eq.originalLatex || eq.latex,
        latex: repaired,
        status: checkStatus(repaired)
      };
    });
    setEquations(updated);
  };
  
  const restoreEquation = (id: string) => {
    setEquations(prev => prev.map(eq => {
      if (eq.id === id && eq.originalLatex) {
        return {
          ...eq,
          latex: eq.originalLatex,
          originalLatex: undefined,
          status: checkStatus(eq.originalLatex)
        };
      }
      return eq;
    }));
  };"""
    content = content[:start_idx] + fix_logic + content[end_idx:]

with open('src/modules/settings/components/EquationMonitorView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
