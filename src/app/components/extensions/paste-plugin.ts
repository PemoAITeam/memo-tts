import { Extension } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";

import { createEditorDocumentFromParagraphs, splitTextIntoParagraphs } from "@/app/lib/editor-import";

export const EventHandler = Extension.create({
  name: "eventHandler",
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            paste: (_view, event: Event) => {
              const text = (event as ClipboardEvent).clipboardData?.getData("text/plain");
              if (typeof text !== "string") {
                return false;
              }

              const paragraphs = splitTextIntoParagraphs(text);
              event.preventDefault();

              if (!paragraphs.length) {
                return true;
              }

              const range = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              };
              const isEmptyEditor = editor.state.doc.childCount === 1
                && editor.state.doc.firstChild?.type.name === "editorCard"
                && editor.state.doc.firstChild.content.size === 0;

              if (paragraphs.length === 1) {
                editor
                  .chain()
                  .insertContentAt(range, paragraphs[0])
                  .focus()
                  .run();

                return true;
              }

              const nextDocument = createEditorDocumentFromParagraphs(paragraphs);

              if (isEmptyEditor) {
                editor.commands.setContent(nextDocument, true);
                editor.commands.focus("end");
                return true;
              }

              editor
                .chain()
                .insertContentAt(range, nextDocument.content || [])
                .focus()
                .run();

              return true;
            },
          },
        },
      }),
    ];
  },
});
