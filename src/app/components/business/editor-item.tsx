import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { TbMicrophone, TbX } from "react-icons/tb";
import { Button } from "../ui/button";
import { parseStoredTTSSelection } from "@/app/lib/tts-plugin";
import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { getVoiceBadgeColors } from "@/app/lib/voice-badge-colors";

function getVoiceBadgeLabel(voice: any): string {
  const selection = parseStoredTTSSelection(voice);
  return selection?.displayLabel || voice?.displayLabel || voice?.voiceLocalName || "";
}

const EditorCardItem = observer(({ node, editor }: NodeViewProps) => {
  const { t } = useTranslation();
  const [voice, setVoice] = useState<string>(() => getVoiceBadgeLabel(node.attrs.voice));

  useEffect(() => {
    setVoice(getVoiceBadgeLabel(node.attrs.voice));
  }, [node.attrs.voice]);

  const deleteVoice = (event: any) => {
    if (event) {
      event.stopPropagation();
    }
    const jsonData = editor.getJSON();
    const curItem = jsonData.content?.find((item) => item.attrs?.id == node.attrs.id && item.type === "editorCard");
    if (curItem?.attrs) {
      curItem.attrs.voice = null;
      setVoice("");
      editor.chain().setContent(jsonData, true).focus().run();
    }
  };

  const { backgroundColor, foregroundColor } = getVoiceBadgeColors(voice);

  return (
    <NodeViewWrapper className="editor-card-item">
      {voice && (
        <div className="pl-7 mt-4 voice-item">
          <Button
            variant={"ghost"}
            size={"sm"}
            style={{ color: foregroundColor, backgroundColor }}
            className="group relative h-6 px-2 bg-accent text-accent-foreground pointer-events-none"
          >
            <TbMicrophone />
            {voice}
            <Button
              size={"icon"}
              className="absolute top-0 -right-7 w-6 h-6 group-hover:opacity-100 opacity-0 transform-gpu duration-200 transition-opacity pointer-events-auto"
              onClick={deleteVoice}
              variant={"destructive"}
            >
              <TbX size={10} />
            </Button>
          </Button>
        </div>
      )}

      <div className="flex items-start">
        <NodeViewContent
          data-placeholder={t("tts.editor placeholder")}
          className={`content flex-1 px-2 editable-content ${node.content.size == 0 ? "is-empty" : ""}`}
        />
      </div>
    </NodeViewWrapper>
  );
});

export default EditorCardItem;
