import { Extension } from "@tiptap/react"
import { Plugin } from '@tiptap/pm/state'

export const EventHandler = Extension.create({
    name: 'eventHandler',
    addProseMirrorPlugins() {
        return [
            new Plugin({  //自定义一个ProseMirror 插件
                props: {
                    handleDOMEvents: {
                        // drop: (view, event: Event) => {
                        //     isDroppedFromProseMirror = dragSourceElement === view.dom.parentElement
                        //     dropEvent = event as DragEvent

                        //     return false
                        // },

                        paste: (view, event: Event) => {
                            // 阻止默认粘贴行为
                            event.preventDefault();
                            const text = (event as ClipboardEvent).clipboardData?.getData('text');
                            if (text) {
                                // 按换行拆分文本
                                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                                const { state, dispatch } = view;
                                const { from } = state.selection;
                                const tr = state.tr;

                                // 获取当前选中的节点
                                const $from = state.selection.$from;
                                const parentNode = $from.parent;
                                const isEmptyEditorCard = parentNode.type.name === 'editorCard' && parentNode.content.size === 0;

                                if (lines.length > 1) {
                                    let startIndex = 0;
                                    if (isEmptyEditorCard) {
                                        // 第一行插入到当前空的 editor-card
                                        tr.insertText(lines[0], from);
                                        startIndex = 1;
                                    }
                                    // 剩下的每一行新建 editor-card
                                    for (let i = startIndex; i < lines.length; i++) {
                                        const node = state.schema.nodes['editorCard'].create(
                                            {},
                                            state.schema.text(lines[i])
                                        );
                                        tr.insert(tr.selection.to, node);
                                    }
                                    dispatch(tr);
                                } else {
                                    // 单行，按原逻辑插入
                                    const transaction = state.tr.insertText(text, state.selection.from, state.selection.to);
                                    dispatch(transaction);
                                }
                            }
                            return false;
                        },
                    },

                },
            }),
        ]
    },
})