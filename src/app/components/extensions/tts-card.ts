import { Node, mergeAttributes } from '@tiptap/react';

export const TTSCard = Node.create({
    name: 'ttsCard',

    group: 'block',

    content: 'editorCard',

    parseHTML() {
        return [
            {
                tag: 'tts-card',
            },
        ];
    },

    addKeyboardShortcuts() {
        return {
            'Enter': () => {
                const jsonData = this.editor.getJSON();
                const EmptyTTSCard = jsonData.content?.filter(item => {
                    const contentLeng = item.content?.filter(info => !!info.content?.length)
                    return item.type === 'ttsCard' && contentLeng?.length === 0
                })
                if(EmptyTTSCard?.length === 0) {
                    return this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, content: [{ type: 'editorCard' }] }).focus().run()
                } else {
                    return false
                }
                
            },
            'Control-V': () => {
                navigator.clipboard.readText().then(text => {
                    this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, content: [{ type: 'text', text }] }).focus().run()
                })
                return true
            },
        }
    },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },
});
