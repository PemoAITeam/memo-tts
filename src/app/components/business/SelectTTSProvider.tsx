import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { inject, observer } from "mobx-react";

import type PluginStore from "@/app/stores/pluginStore";
import { translatePluginText } from "@/app/lib/plugin-i18n";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface SelectTTSProviderProps {
  pluginStore?: PluginStore;
  onChange: (value: string) => void;
}

const SelectTTSProvider = function SelectTTSProvider({ onChange, pluginStore }: SelectTTSProviderProps) {
  const { t } = useTranslation();
  const { provider, setProvider, ttsProviders } = pluginStore!;

  useEffect(() => {
    if (provider || !ttsProviders.length) {
      return;
    }

    const firstProvider = ttsProviders.find((item) => !item.disabled) || ttsProviders[0];
    if (firstProvider) {
      setProvider(firstProvider.provider);
      onChange(firstProvider.provider);
    }
  }, [onChange, provider, setProvider, ttsProviders]);

  const handleProviderChange = useCallback((value: string) => {
    setProvider(value);
    onChange(value);
  }, [onChange, setProvider]);

  return (
    <Select disabled={!ttsProviders.length} value={provider} onValueChange={handleProviderChange}>
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={ttsProviders.length
            ? t("tts.provider", { defaultValue: "TTS provider" })
            : t("tts.no plugin providers", {
              defaultValue: "No TTS plugins available",
            })}
        />
      </SelectTrigger>
      <SelectContent>
        {ttsProviders.map((option) => (
          <SelectItem disabled={option.disabled} key={option.provider} value={option.provider}>
            {translatePluginText(option.pluginId, option.label, option.label || option.provider)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default inject("pluginStore")(observer(SelectTTSProvider));
