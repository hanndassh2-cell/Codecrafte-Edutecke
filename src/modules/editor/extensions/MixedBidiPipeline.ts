import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const BIDI_LRI = '\u2066'; // Left-to-Right Isolate
export const BIDI_PDI = '\u2069'; // Pop Directional Isolate
export const BIDI_FSI = '\u2068'; // First Strong Isolate

export const MixedBidiPipeline = Extension.create({
  name: "mixedBidiPipeline",

  addGlobalAttributes() {
    return [
      {
        types: [
          'image',
          'table',
          'tableRow',
          'tableCell',
          'tableHeader',
          'bulletList',
          'orderedList',
          'blockquote'
        ],
        attributes: {
          style: {
            default: null,
            parseHTML: element => element.style.unicodeBidi || null,
            renderHTML: attributes => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            }
          }
        }
      }
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("mixedBidiCentralPipeline"),
        
        appendTransaction(transactions, oldState, newState) {
          return null;
        },

        props: {
          handleDOMEvents: {
            drop(view, event) {
              return false;
            }
          }
        }
      })
    ];
  }
});

