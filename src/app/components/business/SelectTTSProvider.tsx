import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { inject, observer } from "mobx-react";
import SettingStore from "@/app/stores/settingStore";
import PluginStore from "@/app/stores/pluginStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";

interface SelectTTSProviderProps {
  settingStore?: SettingStore,
  pluginStore?: PluginStore,
  onChange: (value: string) => void;
}

const SelectTTSProvider = function SelectTTSProvider({ onChange, pluginStore, settingStore }: SelectTTSProviderProps) {
  const { t } = useTranslation();
  const usePlugin = useRef(false);
  const { settings } = settingStore!;
  const { memoPlugins, provider, setProvider, ttsProviders, setTTSProviders } = pluginStore!;

  // 从插件中过滤出 TTS 插件
  useEffect(() => {
    if (memoPlugins?.pluginProviders) {
      setTTSProviders((memoPlugins?.pluginProviders || []).filter(item => item.type === "tts"));
    }
  }, [memoPlugins?.pluginProviders])

  // 如果有 TTS 插件提供 providers，保证默认选中一个 provider
  useEffect(() => {
    if (ttsProviders.length > 0 && provider === "" && usePlugin.current) {
      setProvider(ttsProviders[0].value);
    }
  }, [provider, ttsProviders, setProvider])

  const handleProviderChange = useCallback((value: string) => {
    setProvider(value);
    onChange?.(value)
  }, [onChange, setProvider]);

  return (
    <Select value={provider} onValueChange={handleProviderChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="TTS provider" />
      </SelectTrigger>
      <SelectContent>
        {
          usePlugin.current &&
          ttsProviders.map((option) => (
            <SelectItem disabled={option.disabled} key={option.value} value={option.value}>
              {t(((option.pluginId ? option.pluginId + "." : "") + option.label) as any)}
            </SelectItem>
          ))
        }
        <Button size={"sm"} variant={"ghost"} className="w-full" key={"view"}>
          {t("translate.view plugins")}
        </Button>
        {
          !usePlugin.current && (
            <>
              <SelectItem value="OpenAI">
                Open AI {!settings.openAI?.apiKey && t("tts.unset")}
              </SelectItem>
              <SelectItem value="Edge">Edge</SelectItem>
              <SelectItem value="Volcano">
                Volcano {!settings.tts?.volctrans?.accessToken && t("tts.unset")}
              </SelectItem>
            </>
          )
        }
      </SelectContent>
    </Select>
  );
};

export default inject('settingStore', 'pluginStore')(observer(SelectTTSProvider));
