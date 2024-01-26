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
                            const text = (event as ClipboardEvent).clipboardData?.getData('text')
                            if(text) {
                                // 将文本插入到编辑器
                                const transaction = view.state.tr.insertText(text, view.state.selection.from, view.state.selection.to);
                                view.dispatch(transaction);
                                console.log(text)
                            }
                            return false
                        },
                    },

                },
            }),
        ]
    },
})