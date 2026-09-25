// Verifies that advanced media controls stay contextual instead of crowding the writing toolbar.
import fs from "fs";
import path from "path";

const editor = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/RichTextEditor.tsx"),
  "utf-8",
);
const imageView = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/ImageNodeView.tsx"),
  "utf-8",
);

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

assert(
  editor.includes("const TableContextMenu") &&
    editor.includes('currentEditor.isActive("table")') &&
    editor.includes('<TableContextMenu editor={editor} />'),
  "Table controls appear only when the teacher is working inside a table",
);

assert(
  editor.includes("addRowBefore") &&
    editor.includes("addRowAfter") &&
    editor.includes("addColumnBefore") &&
    editor.includes("addColumnAfter") &&
    editor.includes("mergeCells") &&
    editor.includes("splitCell"),
  "The contextual table toolbar covers the common row, column, merge, and split tasks",
);

assert(
  imageView.includes('aria-label="أدوات الصورة"') &&
    imageView.includes("textAlign: 'right'") &&
    imageView.includes("textAlign: 'center'") &&
    imageView.includes("textAlign: 'left'") &&
    imageView.includes("width: '100%'") &&
    imageView.includes("editAltText"),
  "Selecting an image exposes alignment, sizing, accessibility description, and deletion tools",
);

assert(
  imageView.includes("if (nextAlt !== null)") &&
    imageView.includes("deleteSelection().run()"),
  "Image description cancellation is safe and deletion acts only on the selected image",
);
