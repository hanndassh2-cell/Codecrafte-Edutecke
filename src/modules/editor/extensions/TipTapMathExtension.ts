import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, Selection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import katex from "katex";
import "katex/dist/katex.min.css";

export interface MathEditEventData {
  from: number;
  to: number;
  text: string;
}

export interface TipTapMathOptions {
  onEditEquation?: (data: MathEditEventData) => void;
}

function sanitizeTeXForWordArrows(tex: string, displayMode: boolean = false): string {
  if (!tex) return "";
  let cleaned = tex.replace(/[\u2066\u2067\u2068\u2069\u200E\u200F]/g, "");

  // Convert display-only environments (align*, align, gather*, gather, equation*, equation) to inline-compatible equivalents if displayMode is false
  if (!displayMode) {
    cleaned = cleaned
      .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
      .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
      .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
      .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
      .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
      .replace(/\\end\{equation\*?\}/g, "\\end{aligned}")
      .replace(/\\begin\{multline\*?\}/g, "\\begin{aligned}")
      .replace(/\\end\{multline\*?\}/g, "\\end{aligned}");
  }

  cleaned = cleaned.replace(/\\ce\{([^}]+)\}/g, "\\mathrm{$1}");
  cleaned = cleaned.replace(/([A-Z][a-z]?)\s+([0-9]+)/g, "$1_$2");
  cleaned = cleaned
    .replace(/->\[\\Delta\]/g, " \\xrightarrow{\\Delta} ")
    .replace(/->\[([^\]]+)\]/g, " \\xrightarrow{\\text{$1}} ")
    .replace(/->|→|\\rightarrow/g, " \\longrightarrow ")
    .replace(/<=>|⇌|\\rightleftharpoons/g, " \\rightleftharpoons ");
  return cleaned;
}

function buildMathDecorations(
  doc: any,
  options?: TipTapMathOptions,
  getView?: () => EditorView | null,
  selection?: Selection
): DecorationSet {
  const decorations: Decoration[] = [];
  const maxDocPos = doc.content.size;

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;

    const text = node.text;
    if (!text) return;

    // Check if text contains math triggers
    const hasMath = /[\$\\]|■|\u25A0|matrix|bmatrix|pmatrix|vmatrix|cases|aligned/.test(text);
    if (!hasMath) return;

    // Regex for block math $$...$$, inline math $...$, or \begin{env}...\end{env}
    const mathRegex =
      /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^\$])+?)\$|(\\begin\{[a-zA-Z0-9*]+\}[\s\S]*?\\end\{[a-zA-Z0-9*]+\})/g;

    let match: RegExpExecArray | null;
    while ((match = mathRegex.exec(text)) !== null) {
      const rawStart = pos + match.index;
      const rawEnd = rawStart + match[0].length;

      const matchStart = Math.max(0, Math.min(rawStart, maxDocPos));
      const matchEnd = Math.max(matchStart, Math.min(rawEnd, maxDocPos));

      if (matchStart >= matchEnd) continue;

      const rawTex = (match[1] || match[2] || match[3] || "").trim();
      if (!rawTex) continue;

      const isBlock = match[1] !== undefined || match[0].startsWith("$$") || /^\\begin\{(align|gather|equation|multline)\*?\}/.test(rawTex);

      const sanitized = sanitizeTeXForWordArrows(rawTex, isBlock);

      let renderedHtml = "";
      try {
        renderedHtml = katex.renderToString(sanitized, {
          displayMode: isBlock,
          throwOnError: false,
          output: "htmlAndMathml",
          strict: false,
          macros: {
            "\\ce": "\\mathrm{#1}",
          },
        });

        if (renderedHtml.includes("katex-error") || renderedHtml.includes("ParseError")) {
          const fallbackSanitized = rawTex
            .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
            .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
            .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
            .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
            .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
            .replace(/\\end\{equation\*?\}/g, "\\end{aligned}");

          renderedHtml = katex.renderToString(fallbackSanitized, {
            displayMode: isBlock,
            throwOnError: false,
            output: "htmlAndMathml",
            strict: false,
            macros: {
              "\\ce": "\\begin{aligned}",
            },
          });
        }
      } catch (err) {
        try {
          const fallbackSanitized = rawTex
            .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
            .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
            .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
            .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
            .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
            .replace(/\\end\{equation\*?\}/g, "\\end{aligned}");

          renderedHtml = katex.renderToString(fallbackSanitized, {
            displayMode: isBlock,
            throwOnError: false,
            output: "htmlAndMathml",
            strict: false,
          });
        } catch (e) {
          renderedHtml = `<span class="text-rose-500 font-mono text-xs">${rawTex}</span>`;
        }
      }

      const widgetDom = document.createElement(isBlock ? "div" : "span");
      widgetDom.className = isBlock
        ? "math-rendered-block my-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-lg text-center cursor-pointer border border-blue-200 dark:border-blue-900/50 hover:border-blue-400 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] group/math print:my-1 print:p-0 print:border-none print:shadow-none print:bg-transparent"
        : "math-rendered-inline inline-block px-1.5 py-0.5 mx-0.5 print:p-0 print:m-0 bg-blue-50/80 dark:bg-blue-950/50 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer align-baseline hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-all border border-blue-200/80 dark:border-blue-800/50 hover:border-blue-400 active:scale-[0.98] group/math";
      widgetDom.dir = "ltr";
      
      // Highlight if selected
      const isSelected = selection && Math.max(selection.from, matchStart) < Math.min(selection.to, matchEnd);
      if (isSelected || (selection && selection.from <= matchStart && selection.to >= matchEnd)) {
        widgetDom.classList.add("math-selected");
        widgetDom.style.backgroundColor = "rgba(191, 219, 254, 0.7)"; // Tailwind blue-200
        widgetDom.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.5)"; // Tailwind blue-500
      }

      // Inherit inline styles (font size, font family, color, bold, italic) from the raw text node's marks
      try {
        const resolved = doc.resolve(matchStart);
        const textNode = resolved.nodeAfter;
        if (textNode && textNode.marks) {
          textNode.marks.forEach(mark => {
            if (mark.type.name === 'textStyle') {
              if (mark.attrs.fontSize) widgetDom.style.fontSize = mark.attrs.fontSize;
              if (mark.attrs.fontFamily) widgetDom.style.fontFamily = mark.attrs.fontFamily;
              if (mark.attrs.color) widgetDom.style.color = mark.attrs.color;
            }
            if (mark.type.name === 'bold') widgetDom.style.fontWeight = 'bold';
            if (mark.type.name === 'italic') widgetDom.style.fontStyle = 'italic';
            if (mark.type.name === 'underline') widgetDom.style.textDecoration = 'underline';
          });
        }
      } catch (e) {
        console.warn("Could not resolve marks for math decoration", e);
      }

      widgetDom.style.direction = "ltr";
      widgetDom.style.unicodeBidi = "isolate";
      widgetDom.title = "معادلة رياضية - انقر لتحديدها وتعديلها مباشرة";
      widgetDom.innerHTML = renderedHtml;

      // Add data attributes for context menu targeting
      widgetDom.setAttribute("data-math-from", matchStart.toString());
      widgetDom.setAttribute("data-math-to", matchEnd.toString());
      widgetDom.setAttribute("data-math-tex", match ? match[0] : ""); // store the whole match including $$ or $
      widgetDom.setAttribute("data-math-block", isBlock ? "true" : "false");

      // Add a subtle click hint tag
      const hintSpan = document.createElement("span");
      hintSpan.className = "hidden group-hover/math:inline-block mr-1 text-[10px] text-blue-600 dark:text-blue-400 font-sans font-bold bg-blue-100 dark:bg-blue-900 px-1 py-0.2 rounded align-middle [direction:rtl] no-print no-pdf editor-only-hint";
      hintSpan.innerText = "تعديل";
      widgetDom.appendChild(hintSpan);

      // Attach click event for selecting the equation and opening the editor modal
      widgetDom.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const view = (getView ? getView() : null) || (widgetDom.closest(".ProseMirror") as any)?.__tiptapEditor?.view;

        let safeFrom = matchStart;
        let safeTo = matchEnd;
        let fullSourceText = match ? match[0] : "";

        if (view && view.state && view.state.tr) {
          const { tr } = view.state;
          const maxPos = tr.doc.content.size;
          safeFrom = Math.min(Math.max(0, matchStart), maxPos);
          safeTo = Math.min(Math.max(safeFrom, matchEnd), maxPos);

          if (safeFrom <= safeTo) {
            try {
              fullSourceText = tr.doc.textBetween(safeFrom, safeTo) || (match ? match[0] : "");
            } catch {
              fullSourceText = match ? match[0] : "";
            }

            // 1. Select the equation node/text range in ProseMirror safely
            try {
              if (safeFrom < safeTo) {
                const selection = TextSelection.create(tr.doc, safeFrom, safeTo);
                view.dispatch(tr.setSelection(selection));
                view.focus();
              }
            } catch (err) {
              console.warn("Error setting selection on math node:", err);
            }
          }
        }

        const mathData = {
          from: safeFrom,
          to: safeTo,
          text: fullSourceText,
        };

        // 2. Trigger edit callback to open equation editor modal
        if (options?.onEditEquation) {
          options.onEditEquation(mathData);
        } else if (view) {
          const ed = (view.dom as any)?.__tiptapEditor || (view as any)?.editor;
          if (ed && typeof ed.__openEquationEditor === "function") {
            ed.__openEquationEditor(mathData);
          } else if (typeof (window as any).__openGlobalEquationEditor === "function") {
            (window as any).__openGlobalEquationEditor(mathData);
          }
        } else if (typeof (window as any).__openGlobalEquationEditor === "function") {
          (window as any).__openGlobalEquationEditor(mathData);
        }
      });

      // Hide the raw LaTeX source characters and display widget
      if (matchStart < matchEnd && matchEnd <= maxDocPos) {
        decorations.push(
          Decoration.inline(matchStart, matchEnd, {
            class: "math-raw-source hidden-math-text",
          })
        );

        decorations.push(
          Decoration.widget(matchStart, widgetDom, {
            side: -1,
            stopEvent: () => true, // Stop default browser event handling so equation click fires cleanly
          })
        );
      }
    }
  });

  try {
    return DecorationSet.create(doc, decorations);
  } catch (err) {
    console.warn("Failed to create math decoration set:", err);
    return DecorationSet.empty;
  }
}

export const TipTapMathExtension = Extension.create<TipTapMathOptions>({
  name: "tipTapMathExtension",

  addOptions() {
    return {
      onEditEquation: undefined,
    };
  },

  addProseMirrorPlugins() {
    let editorView: EditorView | null = null;
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey("tipTapMathExtension"),
        view(v) {
          editorView = v;
          return {
            update(v) {
              editorView = v;
            },
            destroy() {
              editorView = null;
            },
          };
        },
        state: {
          init(_, state) {
            return buildMathDecorations(state.doc, options, () => editorView, state.selection);
          },
          apply(tr, oldSet, oldState, newState) {
            if (!tr.docChanged && !tr.selectionSet) {
              return oldSet;
            }
            return buildMathDecorations(newState.doc, options, () => editorView, newState.selection);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
