import { Extension } from "@tiptap/core";
import { BULLET_STYLES, NUMBER_STYLES } from "../../../utils/listEngine";

type ListType = "bulletList" | "orderedList";
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customListStyle: {
      /** No style toggles the list. A style selects a gallery entry without unwrapping it. */
      toggleStyledList: (type: ListType, style?: string) => ReturnType;
    };
  }
}

export const CustomListStyle = Extension.create({
  name: "customListStyle",
  priority: 110,
  addGlobalAttributes() {
    return [{
      types: ["bulletList", "orderedList"],
      attributes: {
        listStyle: {
          default: null,
          parseHTML: element => element.getAttribute("data-list-style") || element.getAttribute("data-bullet-symbol") || element.getAttribute("data-bullet-icon") || null,
          renderHTML: attributes => {
            if (!attributes.listStyle) return {};
            const bullet = BULLET_STYLES.find(b => b.id === attributes.listStyle || b.glyph === attributes.listStyle);
            return bullet
              ? { "data-list-style": bullet.id, style: `--list-style: '${bullet.glyph} ';` }
              : { "data-list-style": attributes.listStyle };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      toggleStyledList: (type, style) => ({ chain, tr }) => {
        if (style && !(type === "bulletList" ? BULLET_STYLES : NUMBER_STYLES).some(s => s.id === style)) return false;
        const currentList = () => {
          for (let depth = tr.selection.$from.depth; depth > 0; depth--) {
            const node = tr.selection.$from.node(depth);
            if (node.type.name === "bulletList" || node.type.name === "orderedList") {
              return { node, pos: tr.selection.$from.before(depth) };
            }
          }
          return null;
        };
        if (style && currentList()?.node.type.name === type) {
          const list = currentList()!;
          tr.setNodeMarkup(list.pos, undefined, { ...list.node.attrs, listStyle: style, ...(type === "orderedList" ? { type: null } : {}) });
          return true;
        }
        // TipTap's clearNodes fallback resets heading attributes before wrapping.
        // Convert only selected headings, retaining their explicit block formatting.
        tr.doc.nodesBetween(tr.selection.from, tr.selection.to, (node, pos) => {
          if (node.type.name === "heading") tr.setNodeMarkup(pos, tr.doc.type.schema.nodes.paragraph, node.attrs);
          // Old cards may store typography on li. Materialize inheritance on its
          // paragraph before lifting so removing the list cannot remove formatting.
          if (node.type.name === "paragraph") {
            const $pos = tr.doc.resolve(pos);
            if ($pos.parent.type.name === "listItem") {
              const inherited: Record<string, unknown> = {};
              for (const key of ["fontSize", "fontFamily", "color"]) {
                if (!node.attrs[key] && $pos.parent.attrs[key]) inherited[key] = $pos.parent.attrs[key];
              }
              if (Object.keys(inherited).length) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...inherited });
            }
          }
        });
        return chain().toggleList(type, "listItem", true).command(() => {
          const list = currentList();
          if (style && list?.node.type.name === type) {
            tr.setNodeMarkup(list.pos, undefined, { ...list.node.attrs, listStyle: style, ...(type === "orderedList" ? { type: null } : {}) });
          }
          return true;
        }).run();
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor.commands.toggleStyledList("bulletList"),
      "Mod-Shift-7": () => this.editor.commands.toggleStyledList("orderedList"),
      // Within a table, keep Tab's familiar next-cell behavior. Outside tables,
      // use native list nesting and never let a failed indent leave the editor.
      Tab: () => !this.editor.isActive("table") && this.editor.isActive("listItem") && (this.editor.commands.sinkListItem("listItem") || true),
      "Shift-Tab": () => !this.editor.isActive("table") && this.editor.isActive("listItem") && this.editor.commands.liftListItem("listItem"),
    };
  },
});
