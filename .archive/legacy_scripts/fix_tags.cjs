const fs = require('fs');
const file = 'src/modules/exams/pages/ExamGeneratorView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                                </div>
                              </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
`;

const replacementStr = `                                </div>
                              </div>
                            </div>
                          </>
                        )}
`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync(file, code);
    console.log('Fixed tags in ExamGeneratorView.tsx');
} else {
    console.log('Target string not found');
}
