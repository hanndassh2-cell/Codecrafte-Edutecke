import { generateHTML } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';

const html = '<p><span style="color: red; background-color: yellow;">Test</span></p>';

const json = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [
            { type: 'textStyle', attrs: { color: 'red' } },
            { type: 'highlight', attrs: { color: 'yellow' } }
          ],
          text: 'Test'
        }
      ]
    }
  ]
};

console.log("Generating HTML from JSON:");
console.log(generateHTML(json, [StarterKit, TextStyle, Color, Highlight.configure({ multicolor: true })]));
