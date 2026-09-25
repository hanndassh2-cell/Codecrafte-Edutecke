import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's add labels to the toolbar groups. 
# We'll replace the existing group divs.

text_group = """        {/* Text Group */}
        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 text-center w-full">التحرير</span>
          <div className="flex items-center gap-1">
            <select
              onChange={(e) =>
                activeEditor?.chain().focus().setFontFamily(e.target.value).run()
              }
              value={activeEditor?.getAttributes("textStyle").fontFamily || ""}
              className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
            >
              <option value="">الخط الأساسي</option>
              <option value="Cairo">Cairo</option>
              <option value="Tajawal">Tajawal</option>
              <option value="Arial">Arial</option>
            </select>
            <select className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 w-16 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>14</option>
              <option>16</option>
              <option>18</option>
              <option>20</option>
            </select>
            <button
              onClick={() => {
                const color = window.prompt(
                  "أدخل لون الخط (مثال: red, #ff0000):",
                );
                if (color) activeEditor?.chain().focus().setColor(color).run();
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              title="لون الخط"
            >
              <Baseline className="w-4 h-4" />
            </button>
          </div>
        </div>"""

format_group = """        {/* Format Group */}
        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 text-center w-full">التنسيق</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => activeEditor?.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("bold") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="غامق"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("italic") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="مائل"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                activeEditor?.chain().focus().toggleUnderline().run()
              }
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("underline") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="تحته خط"
            >
              <Underline className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>
            <button
              onClick={() =>
                activeEditor?.chain().focus().setTextAlign("right").run()
              }
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive({ textAlign: "right" }) ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="محاذاة لليمين"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                activeEditor?.chain().focus().setTextAlign("center").run()
              }
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive({ textAlign: "center" }) ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="توسيط"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                activeEditor?.chain().focus().setTextAlign("left").run()
              }
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive({ textAlign: "left" }) ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="محاذاة لليسار"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
          </div>
        </div>"""

insert_group = """        {/* Insert Group */}
        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 text-center w-full">الإدراج</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsImageModalOpen(true)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              title="صورة"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsTableModalOpen(true)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              title="جدول"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeEditor?.isActive("link") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"} border border-slate-200 dark:border-slate-700`}
              title="رابط"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>"""

equation_group = """        {/* Equations Group */}
        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 text-center w-full">المعادلات</span>
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              title="معادلة رياضية"
            >
              <Sigma className="w-4 h-4" />
            </button>
            <button
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px]"
              title="معادلة كيميائية"
            >
              CH₄
            </button>
          </div>
        </div>"""

edit_group = """        {/* Edit Group */}
        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 text-center w-full">الوسائط</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => activeEditor?.chain().focus().undo().run()}
              disabled={!activeEditor?.can().undo()}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title="تراجع"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => activeEditor?.chain().focus().redo().run()}
              disabled={!activeEditor?.can().redo()}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title="إعادة"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>"""


content = re.sub(r'\{\/\* Text Group \*\/\}.*?\{\/\* Format Group \*\/\}', text_group + "\n        {/* Format Group */}", content, flags=re.DOTALL)
content = re.sub(r'\{\/\* Format Group \*\/\}.*?\{\/\* Insert Group \*\/\}', format_group + "\n        {/* Insert Group */}", content, flags=re.DOTALL)
content = re.sub(r'\{\/\* Insert Group \*\/\}.*?\{\/\* Equations Group \*\/\}', insert_group + "\n        {/* Equations Group */}", content, flags=re.DOTALL)
content = re.sub(r'\{\/\* Equations Group \*\/\}.*?\{\/\* Edit Group \*\/\}', equation_group + "\n        {/* Edit Group */}", content, flags=re.DOTALL)
content = re.sub(r'\{\/\* Edit Group \*\/\}.*?<\/div>\s*<\/div>\s*<div className="flex-1', edit_group + "\n      </div>\n\n      <div className=\"flex-1", content, flags=re.DOTALL)


with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
