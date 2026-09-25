import re

with open("src/modules/editor/components/NavigationPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add Edit2/Rename icon to imports
content = content.replace("Move,\n  ChevronDown,", "Move,\n  Edit2,\n  ChevronDown,")

# Update unit hover actions
old_unit_buttons = """                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddLesson(unit.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all"
                  title="إضافة درس"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </button>"""

new_unit_buttons = """                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddLesson(unit.id);
                    }}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-all text-slate-500 hover:text-blue-600"
                    title="إضافة درس"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-all text-slate-500 hover:text-amber-600"
                    title="إعادة تسمية"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-all text-slate-500 hover:text-red-600"
                    title="حذف"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>"""
content = content.replace(old_unit_buttons, new_unit_buttons)

# Update lesson hover actions
old_lesson_buttons = """                        <div
                          className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "opacity-100" : ""}`}
                        >
                          <button
                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-400 hover:text-blue-600 transition"
                            title="نسخ"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-900 transition"
                            title="نقل"
                          >
                            <Move className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLesson(lesson.id);
                            }}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>"""

new_lesson_buttons = """                        <div
                          className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "opacity-100" : ""}`}
                        >
                          <button
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-600 transition"
                            title="نسخ"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-amber-600 transition"
                            title="إعادة تسمية"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                            title="نقل"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Move className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLesson(lesson.id);
                            }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-slate-400 hover:text-red-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>"""
content = content.replace(old_lesson_buttons, new_lesson_buttons)

with open("src/modules/editor/components/NavigationPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
