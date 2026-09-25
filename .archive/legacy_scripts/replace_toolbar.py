import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define the new toolbar
new_toolbar = """      {/* Global Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-wrap items-center gap-2 shrink-0 z-10 shadow-sm sticky top-0 overflow-x-auto">
        {/* Text Group */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
          <select
            onChange={(e) =>
              activeEditor?.chain().focus().setFontFamily(e.target.value).run()
            }
            value={activeEditor?.getAttributes("textStyle").fontFamily || ""}
            className="px-2 py-1.5 border-none rounded text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          >
            <option value="">الخط الأساسي</option>
            <option value="Cairo">Cairo</option>
            <option value="Tajawal">Tajawal</option>
            <option value="Arial">Arial</option>
          </select>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <select className="px-2 py-1.5 border-none rounded text-sm bg-transparent w-16 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>14</option>
            <option>16</option>
            <option>18</option>
            <option>20</option>
          </select>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => {
              const color = window.prompt("أدخل لون الخط (مثال: red, #ff0000):");
              if (color) activeEditor?.chain().focus().setColor(color).run();
            }}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="لون الخط"
          >
            <Baseline className="w-4 h-4" />
          </button>
        </div>

        {/* Format Group */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
          <button
            onClick={() => activeEditor?.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("bold") ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="غامق"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("italic") ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="مائل"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("underline") ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="تحته خط"
          >
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={() => activeEditor?.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive({ textAlign: "right" }) ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="محاذاة لليمين"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive({ textAlign: "center" }) ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="توسيط"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive({ textAlign: "left" }) ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="محاذاة لليسار"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Insert Group */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="صورة"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsTableModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="جدول"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("link") ? "bg-white dark:bg-slate-700 shadow-sm" : ""} text-slate-700 dark:text-slate-300`}
            title="رابط"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Equations Group */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
          <button
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="معادلة رياضية"
          >
            <Sigma className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center font-bold text-xs"
            title="معادلة كيميائية"
          >
            CH₄
          </button>
        </div>

        {/* Edit Group */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
          <button
            onClick={() => activeEditor?.chain().focus().undo().run()}
            disabled={!activeEditor?.can().undo()}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50"
            title="تراجع"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().redo().run()}
            disabled={!activeEditor?.can().redo()}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50"
            title="إعادة"
          >
            <Redo className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="نسخ التنسيق"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        </div>
      </div>"""

start_str = "{/* Global Toolbar */}"
end_str = "{/* Editor Content Area */}"

pattern = re.compile(re.escape(start_str) + r".*?(?=" + re.escape(end_str) + ")", re.DOTALL)
new_content = pattern.sub(new_toolbar + "\n\n      ", content)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)
