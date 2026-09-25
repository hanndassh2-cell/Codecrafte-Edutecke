import { Extension } from "@tiptap/core";

export interface ParagraphStyleOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphStyle: {
      setParagraphStyle: (styles: Record<string, any>) => ReturnType;
      unsetParagraphStyle: (properties: string[]) => ReturnType;
    };
  }
}

export const ParagraphStyle = Extension.create<ParagraphStyleOptions>({
  name: "paragraphStyle",
  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) => {
              if (!attributes.marginTop) return {};
              return { style: `margin-top: ${attributes.marginTop}` };
            },
          },
          marginLeft: {
            default: null,
            parseHTML: (element) => element.style.marginLeft || null,
            renderHTML: (attributes) => {
              if (!attributes.marginLeft) return {};
              return { style: `margin-left: ${attributes.marginLeft}` };
            },
          },
          marginRight: {
            default: null,
            parseHTML: (element) => element.style.marginRight || null,
            renderHTML: (attributes) => {
              if (!attributes.marginRight) return {};
              return { style: `margin-right: ${attributes.marginRight}` };
            },
          },
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
          color: {
            default: null,
            parseHTML: (element) => element.style.color || null,
            renderHTML: (attributes) => attributes.color ? { style: `color: ${attributes.color}` } : {},
          },
          padding: {
            default: null,
            parseHTML: (element) => element.style.padding || element.style.paddingTop || element.style.paddingBottom || element.style.paddingLeft || element.style.paddingRight || null,
            renderHTML: (attributes) => {
              if (!attributes.padding) return {};
              return { style: `padding: ${attributes.padding}` };
            },
          },
          border: {
            default: null,
            parseHTML: (element) => element.style.border || element.style.borderTop || element.style.borderBottom || element.style.borderLeft || element.style.borderRight || null,
            renderHTML: (attributes) => {
              if (!attributes.border) return {};
              return { style: `border: ${attributes.border}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParagraphStyle:
        (styles: Record<string, any>) =>
        ({ commands }) => {
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, styles)
          );
        },
      unsetParagraphStyle:
        (properties: string[]) =>
        ({ commands }) => {
          const resetStyles = properties.reduce((acc, prop) => {
            acc[prop] = null;
            return acc;
          }, {} as Record<string, any>);
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, resetStyles)
          );
        },
    };
  },
});
