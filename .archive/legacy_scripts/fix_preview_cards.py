import re

with open("src/modules/editor/components/PreviewPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Instead of just rendering MathText, we check type.
old_rendering = """                  <section className="space-y-1 mb-4">
                    <h3
                      className={`text-xs font-extrabold border-b border-blue-200 pb-0.5 ${p.style?.color || "text-blue-900"}`}
                      style={{
                        fontFamily: p.style?.fontFamily,
                        fontSize: p.style?.fontSize,
                        color:
                          p.style?.color && !p.style.color.startsWith("text-")
                            ? p.style.color
                            : undefined,
                      }}
                    >
                      {p.title}
                    </h3>
                    <div
                      className="lesson-content-paragraph text-[12px] leading-relaxed text-slate-800"
                      style={{
                        fontFamily: p.style?.bodyFontFamily,
                        fontSize: p.style?.bodyFontSize,
                      }}
                    >
                      <MathText text={p.body || ""} />
                    </div>
                  </section>"""

new_rendering = """                  <section className="space-y-2 mb-4">
                    <h3
                      className={`text-xs font-extrabold border-b border-blue-200 pb-0.5 ${p.style?.color || "text-blue-900"}`}
                      style={{ fontFamily: p.style?.fontFamily, fontSize: p.style?.fontSize, color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined }}
                    >
                      {p.title}
                    </h3>
                    <div
                      className="lesson-content-paragraph text-[12px] leading-relaxed text-slate-800"
                      style={{ fontFamily: p.style?.bodyFontFamily, fontSize: p.style?.bodyFontSize }}
                    >
                      {(() => {
                        if (["images", "activities", "questions", "notes"].includes(p.type) && p.body.startsWith("{")) {
                          try {
                            const data = JSON.parse(p.body);
                            if (p.type === "images") {
                              return (
                                <div className={`flex justify-${data.align === 'right' ? 'start' : data.align === 'left' ? 'end' : 'center'} my-4`}>
                                  <div className="relative inline-block">
                                    <img src={data.url} alt={data.caption} className={`rounded shadow-sm ${data.size === 'small' ? 'max-w-[150px]' : data.size === 'medium' ? 'max-w-[300px]' : 'max-w-full'}`} />
                                    {data.caption && <p className="text-center text-[10px] text-slate-500 mt-1">{data.caption}</p>}
                                  </div>
                                </div>
                              );
                            }
                            if (p.type === "activities") {
                              return (
                                <div className="border-2 border-orange-200 bg-orange-50/30 rounded-lg p-3 my-2">
                                  <div className="flex justify-between items-center mb-2 border-b border-orange-100 pb-1">
                                    <span className="font-bold text-orange-800">نشاط {data.type === 'individual' ? 'فردي' : data.type === 'group' ? 'جماعي' : 'منزلي'}</span>
                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">المدة: {data.duration} دقائق</span>
                                  </div>
                                  {data.tools && <div className="mb-2"><strong className="text-orange-700">الأدوات: </strong>{data.tools}</div>}
                                  <div><strong className="text-orange-700 block mb-1">الخطوات:</strong><div className="whitespace-pre-wrap pl-2">{data.steps}</div></div>
                                </div>
                              );
                            }
                            if (p.type === "questions") {
                              return (
                                <div className="border border-red-200 bg-red-50/30 rounded-lg p-3 my-2">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-slate-800 flex-1 ml-2">س: <MathText inline text={data.text} /></div>
                                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded shrink-0">{data.score} درجة</span>
                                  </div>
                                  {data.answer && <div className="mt-2 text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-100"><strong>الإجابة: </strong><MathText inline text={data.answer} /></div>}
                                </div>
                              );
                            }
                            if (p.type === "notes") {
                              const noteColors = { info: "bg-blue-50 border-blue-200 text-blue-800", warning: "bg-amber-50 border-amber-200 text-amber-800", tip: "bg-emerald-50 border-emerald-200 text-emerald-800", quote: "bg-slate-100 border-slate-300 text-slate-700 italic border-r-4" };
                              const colorClass = noteColors[data.type as keyof typeof noteColors] || noteColors.info;
                              return (
                                <div className={`border p-3 rounded-lg my-2 ${colorClass}`}>
                                  <div className="whitespace-pre-wrap">{data.text}</div>
                                </div>
                              );
                            }
                          } catch (e) {}
                        }
                        return <MathText text={p.body || ""} />;
                      })()}
                    </div>
                  </section>"""

content = content.replace(old_rendering, new_rendering)

with open("src/modules/editor/components/PreviewPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
