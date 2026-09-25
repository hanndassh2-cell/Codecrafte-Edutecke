import { Extension } from "@tiptap/core";

export interface ParagraphSpacingOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (spacing: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: "paragraphSpacing",

  addOptions() {
    return {
      types: ["paragraph", "heading", "bulletList", "orderedList"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => {
              const mb = element.style.marginBottom;
              if (mb) return mb;
              return element.getAttribute("data-paragraph-spacing") || null;
            },
            renderHTML: (attributes) => {
              if (attributes.paragraphSpacing === null || attributes.paragraphSpacing === undefined) {
                return {};
              }
              const val = attributes.paragraphSpacing;
              const formatted = /^\d+$/.test(val) ? `${val}pt` : val;
              return {
                style: `margin-top: 0 !important; margin-bottom: ${formatted} !important;`,
                "data-paragraph-spacing": formatted,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ commands }) => {
          const formatted = /^\d+$/.test(spacing) ? `${spacing}pt` : spacing;
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, { paragraphSpacing: formatted })
          );
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }) => {
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, { paragraphSpacing: null })
          );
        },
    };
  },
});
