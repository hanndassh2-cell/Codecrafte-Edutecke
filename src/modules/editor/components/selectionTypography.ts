import type { Mark } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

/** Read the selection, never rewrite saved typography to match toolbar defaults. */
export function selectionTypography(editor: Editor) {
  const { doc, selection, storedMarks } = editor.state;
  const sizes = new Set<string>(), families = new Set<string>(), colors = new Set<string>();
  const alignments = new Set<string>(), directions = new Set<string>(), headings = new Set<string>();
  const collect = (pos: number, marks: readonly Mark[]) => {
    const $pos = doc.resolve(pos);
    const inline = marks.find(mark => mark.type.name === 'textStyle')?.attrs || {};
    const inherited = (key: string, fallback: string) => {
      if (inline[key]) return String(inline[key]);
      for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).attrs[key]) return String($pos.node(depth).attrs[key]);
      }
      return fallback;
    };
    sizes.add(inherited('fontSize', '12pt'));
    families.add(inherited('fontFamily', "'Times New Roman', Times, serif"));
    colors.add(inherited('color', '#0f172a'));
    const dir = inherited('dir', 'rtl');
    directions.add(dir);
    alignments.add(inherited('textAlign', dir === 'ltr' ? 'left' : 'right'));
    headings.add($pos.parent.type.name === 'heading' ? String($pos.parent.attrs.level) : 'p');
  };
  if (selection.empty) collect(selection.from, storedMarks || selection.$from.marks());
  else for (const range of selection.ranges) {
    doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
      if (node.isText) collect(Math.max(pos, range.$from.pos), node.marks);
      else if (node.isTextblock && !node.content.size) collect(pos + 1, []);
    });
  }
  if (!sizes.size) collect(selection.from, selection.$from.marks());
  return {
    fontSize: sizes.size === 1 ? [...sizes][0] : '',
    fontFamily: families.size === 1 ? [...families][0] : '',
    color: colors.size === 1 ? [...colors][0] : '',
    textAlign: alignments.size === 1 ? [...alignments][0] : '',
    dir: directions.size === 1 ? [...directions][0] : '',
    headingLevel: headings.size === 1 ? [...headings][0] : '',
  };
}
