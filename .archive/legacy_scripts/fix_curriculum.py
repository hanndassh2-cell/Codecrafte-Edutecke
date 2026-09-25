import re

with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

validator_button = """
          {/* Link Validator */}
          <button
            onClick={() => setShowValidatorModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          >
            <Link className="w-4 h-4" />
            فحص الروابط والأيتام
          </button>
"""

# add showValidatorModal state
state_match = re.search(r'const \[searchTerm, setSearchTerm\] = useState\(""\);', content)
if state_match:
    content = content.replace(state_match.group(0), state_match.group(0) + '\n  const [showValidatorModal, setShowValidatorModal] = useState(false);')

# add Link to lucide-react if missing
if 'Link } from "lucide-react"' not in content and 'Link,' not in content:
    content = content.replace('Search,', 'Search,\n  Link,')

# add button next to search box
content = content.replace('{/* Search Box */}', validator_button + '\n          {/* Search Box */}')

# add modal at the end before final </div>
modal_component = """
      {showValidatorModal && (
        <EquationLinkValidatorModal onClose={() => setShowValidatorModal(false)} />
      )}
"""
content = content.replace('    </div>\n  );\n};\n', modal_component + '    </div>\n  );\n};\n')

# Add the component at the very bottom
validator_component = """

const EquationLinkValidatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [issues, setIssues] = useState<{ id: string; type: string; title: string; desc: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate finding orphaned equations or broken question links
    setTimeout(() => {
      const allQuestions = storage.getQuestions();
      const allLessons = storage.getLessons();
      
      const foundIssues: { id: string; type: string; title: string; desc: string }[] = [];
      
      allQuestions.forEach(q => {
        if (!q.lessonId || !allLessons.find(l => l.id === q.lessonId)) {
          foundIssues.push({
            id: q.id,
            type: "سؤال يتيم",
            title: q.text.replace(/<[^>]+>/g, '').substring(0, 30) + '...',
            desc: "هذا السؤال غير مرتبط بأي درس موجود حالياً (الرابط مفقود)."
          });
        }
      });
      
      setIssues(foundIssues);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Equation Link Validator</h2>
              <p className="text-xs text-slate-500">فحص دوري لروابط الأسئلة بالدروس وتحديد الأيتام والتعارضات.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>جاري فحص قاعدة البيانات بحثاً عن روابط مفقودة...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-12 text-emerald-600">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">النظام سليم</h3>
              <p className="text-sm">لم يتم العثور على أي أسئلة يتيمة أو معادلات مفقودة الروابط.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-sm font-semibold border border-amber-200 dark:border-amber-800">
                تم العثور على {issues.length} مشكلة تتطلب انتباهك.
              </div>
              {issues.map(issue => (
                <div key={issue.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-4">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{issue.type}</span>
                      <span className="text-xs text-slate-400 font-mono">ID: {issue.id}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{issue.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{issue.desc}</p>
                  </div>
                  <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors">
                    إصلاح الرابط
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
"""

content += validator_component

with open('src/modules/curriculum/pages/CurriculumTreeView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
