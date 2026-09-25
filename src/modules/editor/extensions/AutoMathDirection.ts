import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { isMathEquationLine } from "../../../components/MathText";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    autoMathDirection: {
      setTextDirection: (dir: "rtl" | "ltr" | "auto") => ReturnType;
      unsetTextDirection: () => ReturnType;
    };
  }
}

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_REGEX = /[A-Za-z]/;

export function detectScriptDirection(text: string): "rtl" | "ltr" {
  if (!text || !text.trim()) return "rtl";
  if (isMathEquationLine(text)) return "ltr";
  if (ARABIC_REGEX.test(text)) return "rtl";
  if (LATIN_REGEX.test(text) && !ARABIC_REGEX.test(text)) return "ltr";
  return "rtl";
}

const SUPPORTED_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "bulletList",
  "orderedList",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
];

export const AutoMathDirection = Extension.create({
  name: "autoMathDirection",

  addGlobalAttributes() {
    return [
      {
        types: SUPPORTED_BLOCK_TYPES,
        attributes: {
          dir: {
            default: "rtl",
            parseHTML: (element) => {
              const dirAttr = element.getAttribute("dir") || element.getAttribute("data-dir");
              if (dirAttr === "ltr" || dirAttr === "rtl") return dirAttr;

              const styleDir = element.style.direction;
              if (styleDir === "ltr" || styleDir === "rtl") return styleDir;

              const text = element.textContent || "";
              return detectScriptDirection(text);
            },
            renderHTML: (attributes) => {
              const targetDir = attributes.dir === "ltr" ? "ltr" : "rtl";
              return {
                dir: targetDir,
                "data-dir": targetDir,
              };
            },
          },
          dirMode: {
            default: "auto",
            parseHTML: (element) => {
              const mode = element.getAttribute("data-dir-mode");
              if (mode === "manual" || mode === "auto") return mode;
              if (element.hasAttribute("dir") && (element.getAttribute("dir") === "ltr" || element.getAttribute("dir") === "rtl")) {
                return "manual";
              }
              return "auto";
            },
            renderHTML: (attributes) => {
              const mode = attributes.dirMode || "auto";
              return {
                "data-dir-mode": mode,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (dir: "rtl" | "ltr" | "auto") =>
        ({ state, dispatch, tr }) => {
          const { selection } = state;
          const { from, to } = selection;

          let hasModified = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (SUPPORTED_BLOCK_TYPES.includes(node.type.name)) {
              let targetDir: "rtl" | "ltr" = "rtl";
              let targetMode: "manual" | "auto" = "manual";

              if (dir === "auto") {
                targetMode = "auto";
                targetDir = detectScriptDirection(node.textContent || "");
              } else {
                targetDir = dir === "ltr" ? "ltr" : "rtl";
                targetMode = "manual";
              }

              const newAttrs = {
                ...node.attrs,
                dir: targetDir,
                dirMode: targetMode,
              };

              tr.setNodeMarkup(pos, undefined, newAttrs);
              hasModified = true;
            }
          });

          if (hasModified && dispatch) {
            dispatch(tr);
            return true;
          }
          return false;
        },
      unsetTextDirection:
        () =>
        ({ state, dispatch, tr }) => {
          const { selection } = state;
          const { from, to } = selection;

          let hasModified = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (SUPPORTED_BLOCK_TYPES.includes(node.type.name)) {
              const autoDir = detectScriptDirection(node.textContent || "");
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dir: autoDir,
                dirMode: "auto",
              });
              hasModified = true;
            }
          });

          if (hasModified && dispatch) {
            dispatch(tr);
            return true;
          }
          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("autoMathDirection"),
        appendTransaction(transactions, oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return;

          let tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (SUPPORTED_BLOCK_TYPES.includes(node.type.name)) {
              // Respect user manual override
              if (node.attrs.dirMode === "manual") {
                return;
              }

              const text = node.textContent;
              if (!text || !text.trim()) return;

              const expectedDir = detectScriptDirection(text);
              const currentDir = node.attrs.dir;

              if (currentDir !== expectedDir) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  dir: expectedDir,
                  dirMode: "auto",
                });
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});


