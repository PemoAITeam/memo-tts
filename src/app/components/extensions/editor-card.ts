import { ReactNodeViewRenderer, Node, mergeAttributes } from '@tiptap/react';
import EditorCardItem from '../business/editor-item';
import { generateUUID, hasDuplicateId } from '@/app/lib/utils';

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
                const uuid = generateUUID()
                this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, attrs: { id: uuid } }).focus().run()
                const jsonData = this.editor.getJSON();
                const duplicateId = hasDuplicateId(jsonData.content!)
                if (duplicateId) {
                    const splitItems: any = [];
                    jsonData.content?.forEach((item: any) => {
                        if (item.attrs?.id === duplicateId) {
                            splitItems.push(item)
                            if (item.content) {
                                item.content[0].text = item.content[0].text.trim()
                            }
                        }
                    });
                    if (!splitItems[0].content) {
                        splitItems[0].attrs.id = generateUUID()
                    } else {
                        splitItems[1].attrs.id = generateUUID()
                    }
                    const addIndex = jsonData.content?.findIndex(item => item.attrs?.id === uuid)
                    if (addIndex && addIndex > -1) {
                        jsonData.content?.splice(addIndex, 1)
                    }
                    this.editor.commands.setContent(jsonData, true)
                }
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
