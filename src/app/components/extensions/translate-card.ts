import { ReactNodeViewRenderer, Node, mergeAttributes } from '@tiptap/react';
import TranslateItem from '../business/translate-item';
import { generateUUID } from '@/app/lib/utils';

export const TranslateCard = Node.create({
    name: 'translateCard',

    group: 'block',

    content: 'inline*',

    addAttributes() {
        return {
            id: {
                default: generateUUID(),
                rendered: false,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'translate-card',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(TranslateItem)
    },
});