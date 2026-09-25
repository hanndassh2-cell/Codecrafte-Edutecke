#!/bin/bash
sed -i 's/import { QuestionTextBuilder } from "..\/components\/QuestionTextBuilder";/import { RichTextEditor } from "..\/..\/editor\/components\/RichTextEditor";\nimport { EditorRibbon } from "..\/..\/editor\/components\/EditorRibbon";\nimport { Editor } from "@tiptap\/react";/' src/modules/questions/pages/QuestionEditorPage.tsx

sed -i 's/const \[formText, setFormText\]/const [activeEditor, setActiveEditor] = useState<Editor | null>(null);\n  const [activeRibbonTab, setActiveRibbonTab] = useState<any>("home");\n  const [isImageModalOpen, setIsImageModalOpen] = useState(false);\n  const [isTableModalOpen, setIsTableModalOpen] = useState(false);\n  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);\n\n  const [formText, setFormText]/' src/modules/questions/pages/QuestionEditorPage.tsx

