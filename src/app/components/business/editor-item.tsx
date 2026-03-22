import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { TbMicrophone, TbX, TbLanguage } from "react-icons/tb";
import { generateUUID } from "@/app/lib/utils";
import TranslatePanel from "./translate-panel";
import { cloneDeep } from "lodash-es";
import type { WhisperSegments } from "@/app/interface";
import { Button } from "../ui/button";
import TTSPanel, { type VoiceOptions } from "./tts-panel";
import { parseStoredTTSSelection } from "@/app/lib/tts-plugin";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useTranslation } from "react-i18next";
import { observer } from "mobx-react";

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

function getVoiceBadgeLabel(voice: any, t: any): string {
  const selection = parseStoredTTSSelection(voice);
  const displayLabel = selection?.displayLabel || voice?.displayLabel || voice?.voiceLocalName;
  if (!displayLabel) {
    return "";
  }

  const target = selection?.target || voice?.target || "original";
  return `${displayLabel}(${target === "original" ? t("tts.original text") : t("tts.translate text")})`;
}

const EditorCardItem = observer(({ node, editor }: NodeViewProps) => {
  const { t } = useTranslation();
  const [voice, setVoice] = useState<string>(() => getVoiceBadgeLabel(node.attrs.voice, t));
  const [openTTS, setOpenTTS] = useState(false);
  const [openTranslate, setOpenTranslate] = useState(false);

  useEffect(() => {
    setVoice(getVoiceBadgeLabel(node.attrs.voice, t));
  }, [node.attrs.voice, t]);

  const addTranslate = (translateData: WhisperSegments[]) => {
    const jsonData = editor.getJSON();
    if (jsonData.content) {
      const index = jsonData.content?.findIndex((item) => item.attrs?.id == node.attrs.id);
      if (index > -1) {
        if (jsonData.content[index + 1]?.type === "translateCard") {
          jsonData.content[index + 1].content = [{ type: "text", text: translateData[0].text }];
          editor.chain().setContent({ type: "doc", content: cloneDeep(jsonData.content) }, true).focus().run();
        } else {
          const list = [
            ...jsonData.content.slice(0, index + 1),
            { type: "translateCard", attrs: { id: generateUUID() }, content: [{ type: "text", text: translateData[0].text }] },
            ...jsonData.content.slice(index + 1),
          ];
          editor.chain().setContent({ type: "doc", content: list }, true).focus().run();
        }
      }
    }
    setOpenTranslate(false);
  };

  const getContent = () => {
    return [{ text: node.content.toJSON()[0].text }];
  };

  const addVoice = (data: VoiceOptions) => {
    const jsonData = editor.getJSON();
    if (jsonData.content) {
      const curItem = jsonData.content?.find((item) => item.attrs?.id == node.attrs.id && item.type === "editorCard");
      if (curItem && curItem.attrs) {
        curItem.attrs.voice = cloneDeep(data);
        setVoice(getVoiceBadgeLabel(curItem.attrs.voice, t));
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
        <Popover open={openTranslate} onOpenChange={setOpenTranslate}>
          <PopoverTrigger asChild>
            <button
              title={t("app.translate")}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={node.content.size == 0}
            >
              <TbLanguage size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" sideOffset={10} className="w-auto">
            <TranslatePanel getTranslateData={addTranslate} getContent={getContent} />
          </PopoverContent>
        </Popover>
        <NodeViewContent className={`content flex-1 px-2 editable-content ${node.content.size == 0 ? "is-empty" : ""}`} />
      </div>
    </NodeViewWrapper>
  );
});

export default EditorCardItem;
