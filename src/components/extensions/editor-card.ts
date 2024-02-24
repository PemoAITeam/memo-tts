import { ReactNodeViewRenderer, Node, mergeAttributes } from '@tiptap/react';
import EditorCardItem from '../business/editor-item';
import { generateUUID } from '@/lib/utils';

// declare module '@tiptap/react' {
//     interface Commands<ReturnType> {
//         editorCard: {
//             insertEditorCard: () => ReturnType;
//         };
//     }
// }

export const EditorCard = Node.create({
    name: 'editorCard',

    group: 'block',

    content: 'inline*',

    addAttributes() {
        return {
            id: {
                default: generateUUID(),
                rendered: false,
            },
            voice: {
                default: null,
                rendered: false
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'editor-card',
            },
        ];
    },

    addKeyboardShortcuts() {
        return {
            'Enter': () => {
                const data = this.editor.state.toJSON().doc.content;
                const uuid = generateUUID()
                this.editor.commands.insertContentAt(this.editor.state.selection.head, { type: this.type.name, attrs: {id: uuid} })
                const jsonData = this.editor.getJSON();
                let splitItem: any;
                jsonData.content?.forEach((item: any) => {
                    if(data.findIndex((info: any) => info.attrs.id === item.attrs?.id && item.content && info.content[0].text !== item.content![0].text) > -1) {
                        item.content[0].text = item.content[0].text.trim()
                        splitItem = item
                    }
                });
                if(splitItem && splitItem.attrs) {
                    splitItem.attrs.id = generateUUID()
                    const addIndex = jsonData.content?.findIndex(item => item.attrs?.id === uuid)
                    if(addIndex && addIndex > -1) {
                        jsonData.content?.splice(addIndex, 1)
                    }
                    this.editor.chain().setContent(jsonData).focus().run()
                }
                return true
            },
            'Control-V': () => {
                navigator.clipboard.readText().then(text => {
                    this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, content: [{type: 'text', text}] }).focus().run()
                })
                return true
            },
        }
    },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(EditorCardItem)
    },
});