import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { TbMicrophone, TbX } from "react-icons/tb";
import { cloneDeep } from "lodash-es";
import { Button } from "../ui/button";
import TTSPanel, { type VoiceOptions } from "./tts-panel";
import { parseStoredTTSSelection } from "@/app/lib/tts-plugin";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";

// Derive a stable badge color from the selected voice label.
function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `#${((hash >> 24) & 0xff).toString(16).padStart(2, "0")}${((hash >> 16) & 0xff).toString(16).padStart(2, "0")}${((hash >> 8) & 0xff).toString(16).padStart(2, "0")}`;
  return color;
}

// Pick a readable foreground color for the badge background.
function getContrastingColor(color: string): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

function getVoiceBadgeLabel(voice: any): string {
  const selection = parseStoredTTSSelection(voice);
  return selection?.displayLabel || voice?.displayLabel || voice?.voiceLocalName || "";
}

const EditorCardItem = observer(({ node, editor }: NodeViewProps) => {
  const { t } = useTranslation();
  const [voice, setVoice] = useState<string>(() => getVoiceBadgeLabel(node.attrs.voice));
  const [openTTS, setOpenTTS] = useState(false);
  const placeholderText = t("tts.editor placeholder", {
    defaultValue: "@你想要的角色，比如：旁白、小美、客服，然后输入你想合成的内容",
  });

  useEffect(() => {
    setVoice(getVoiceBadgeLabel(node.attrs.voice));
  }, [node.attrs.voice]);

  const addVoice = (data: VoiceOptions) => {
    const jsonData = editor.getJSON();
    if (jsonData.content) {
      const curItem = jsonData.content?.find((item) => item.attrs?.id == node.attrs.id && item.type === "editorCard");
      if (curItem && curItem.attrs) {
        curItem.attrs.voice = cloneDeep(data);
        setVoice(getVoiceBadgeLabel(curItem.attrs.voice));
        editor.chain().setContent(jsonData, true).focus().run();
      }
    }
  };

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

  const textColor = hashStringToColor(voice);
  const backgroundColor = getContrastingColor(textColor);

  return (
    <NodeViewWrapper className="editor-card-item">
      {voice && (
        <div className=" pl-7 mt-4 voice-item">
          <Popover open={openTTS} onOpenChange={(open: boolean) => setOpenTTS(open)}>
            <PopoverTrigger asChild>
              <Button
                variant={"ghost"}
                size={"sm"}
                style={{ color: backgroundColor, backgroundColor: textColor }}
                className="group relative h-6 px-2 bg-accent text-accent-foreground"
              >
                <TbMicrophone />
                {voice}
                <Button
                  size={"icon"}
                  className="absolute top-0 -right-7 w-6 h-6 group-hover:opacity-100 opacity-0 transform-gpu duration-200 transition-opacity"
                  onClick={deleteVoice}
                  variant={"destructive"}
                >
                  <TbX size={10} />
                </Button>
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" sideOffset={10} className="w-auto editor-card-tts">
              <TTSPanel getVoiceOptions={addVoice} voiceOptions={parseStoredTTSSelection(node.attrs.voice)} showConfirmButton />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex items-start">
        <NodeViewContent
          data-placeholder={placeholderText}
          className={`content flex-1 px-2 editable-content ${node.content.size == 0 ? "is-empty" : ""}`}
        />
      </div>
    </NodeViewWrapper>
  );
});

export default EditorCardItem;
