import { useCallback, useEffect, useRef, useState } from "react";
import { inject, observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { cloneDeep, isEqual, merge } from "lodash-es";
import { type AimForm, createExposedLayout, FormRenderer, type FormRendererHandle } from "memo-form-renderer";

import type PluginStore from "@/app/stores/pluginStore";
import { buildTTSSelection, getTTSHostErrorMessage, type TTSTarget, type TTSSelection } from "@/app/lib/tts-plugin";
import { toast } from "@/app/components/ui/use-toast";

import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";

export type VoiceOptions = TTSSelection;

interface TTSPanelProps {
  pluginStore?: PluginStore;
  getOptions?: (data: VoiceOptions) => void;
  getTarget?: (target: TTSTarget) => void;
  voiceOptions?: VoiceOptions;
  getVoiceOptions?: (options: VoiceOptions) => void;
  showConfirmButton?: boolean;
}

const TTSPanel = inject("pluginStore")(observer(({
  pluginStore,
  showConfirmButton,
  voiceOptions,
  getVoiceOptions,
  getOptions,
  getTarget,
}: TTSPanelProps) => {
  const { memoPlugins, provider, ttsProviders } = pluginStore!;
  const { t } = useTranslation();

  const [target, setTarget] = useState<TTSTarget>(voiceOptions?.target || "original");
  const [config, setConfig] = useState<Record<string, any>>(voiceOptions?.config || {});
  const [layout, setLayout] = useState<AimForm<Record<string, any>>>();
  const [audioUrl, setAudioUrl] = useState<string>();

  const formRef = useRef<FormRendererHandle>(null);

  const currentProviderMeta = ttsProviders.find((item) => item.provider === provider);
  const currentManifest = currentProviderMeta
    ? memoPlugins?.installedPluginsManifests?.[currentProviderMeta.pluginId]
    : undefined;
  const currentProvider = currentProviderMeta?.provider;
  const synthesize = window.AIM?.tts?.synthesize;
  const hasPreviewApi = !!synthesize;

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (voiceOptions?.provider === provider) {
      setTarget((prev) => (prev === voiceOptions.target ? prev : voiceOptions.target));
      setConfig((prev) => (isEqual(prev, voiceOptions.config || {}) ? prev : (voiceOptions.config || {})));
      return;
    }

    setTarget((prev) => (prev === "original" ? prev : "original"));
  }, [provider, voiceOptions]);

  useEffect(() => {
    if (!memoPlugins || !currentProviderMeta) {
      setLayout((prev) => (prev === undefined ? prev : undefined));
      return;
    }

    const version = memoPlugins.localPlugins?.versions?.[currentProviderMeta.pluginId];
    const manifest = memoPlugins.installedPluginsManifests?.[currentProviderMeta.pluginId];
    const plugin = memoPlugins.installedPlugins?.[currentProviderMeta.pluginId];
    const storedConfig = version
      ? cloneDeep(memoPlugins.pluginsConfigurations?.[`${currentProviderMeta.pluginId}@${version}`] || {})
      : {};
    const providerConfig = voiceOptions?.provider === currentProviderMeta.provider
      ? merge({}, storedConfig, voiceOptions.config || {})
      : storedConfig;
    const resolvedConfig = merge({}, manifest?.defaultsConfiguration || {}, providerConfig);

    setConfig((prev) => (isEqual(prev, resolvedConfig) ? prev : resolvedConfig));
    pluginStore?.setRuntimeTTSConfiguration(currentProviderMeta.provider, resolvedConfig);

    if (manifest?.configurationExposed?.length) {
      const nextLayout = createExposedLayout(manifest, resolvedConfig, currentProviderMeta.pluginId, plugin?.file);
      setLayout((prev) => (isEqual(prev, nextLayout) ? prev : nextLayout));
      return;
    }

    setLayout((prev) => (prev === undefined ? prev : undefined));
  }, [currentProviderMeta, memoPlugins, provider, voiceOptions]);

  const buildSelection = useCallback(() => {
    if (!currentProviderMeta) {
      return undefined;
    }

    return buildTTSSelection({
      providerMeta: currentProviderMeta,
      manifest: currentManifest,
      target,
      config,
    });
  }, [config, currentManifest, currentProviderMeta, target]);

  useEffect(() => {
    if (!showConfirmButton) {
      const selection = buildSelection();
      if (selection) {
        getOptions?.(selection);
      }
    }
  }, [buildSelection, getOptions, showConfirmButton]);

  const handlePluginConfigChange = useCallback((data: Record<string, any>) => {
    setConfig((prev) => (isEqual(prev, data) ? prev : data));
    if (currentProvider) {
      pluginStore?.setRuntimeTTSConfiguration(currentProvider, data);
    }
  }, [currentProvider, pluginStore]);

  const handleTargetChange = (value: TTSTarget) => {
    setTarget(value);
    getTarget?.(value);
  };

  const addVoice = () => {
    const selection = buildSelection();
    if (selection) {
      getVoiceOptions?.(selection);
    }
  };

  const audition = async () => {
    if (!currentProviderMeta) {
      return;
    }

    if (!hasPreviewApi) {
      toast({
        variant: "destructive",
        description: t("tts.preview not supported", {
          defaultValue: "The Electron host has not exposed plugin voice preview yet.",
        }),
      });
      return;
    }

    try {
      const result = await synthesize({
        provider: currentProviderMeta.provider,
        pluginId: currentProviderMeta.pluginId,
        text: "Welcome to temo",
        options: cloneDeep(config),
        returnBuffer: true,
      });

      if (!result?.success || !result.data) {
        toast({
          variant: "destructive",
          description: getTTSHostErrorMessage(
            result?.message,
            t("tts.preview failed", {
              defaultValue: "Voice preview failed. Please check the plugin configuration in the host.",
            })
          ),
        });
        return;
      }

      const bufferLike = result.data?.data ?? result.data;
      const nextUrl = URL.createObjectURL(new Blob([bufferLike], { type: "audio/mpeg" }));
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(nextUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        description: getTTSHostErrorMessage(
          error,
          t("tts.preview failed", {
            defaultValue: "Voice preview failed. Please check the plugin configuration in the host.",
          })
        ),
      });
      return;
    }
  };

  return (
    <>
      {layout && (
        <FormRenderer
          key={currentProviderMeta?.pluginId}
          onOpenChange={() => { }}
          className="pb-2"
          ref={formRef}
          onChange={handlePluginConfigChange}
          layout={layout}
        />
      )}

      {!layout && (
        <div className="text-sm text-muted-foreground pb-2">
          {!ttsProviders.length
            ? t("tts.no plugin providers", {
              defaultValue: "No TTS plugins are available. Install a host TTS plugin to continue.",
            })
            : currentProviderMeta
              ? t("tts.plugin config handled by host", {
                defaultValue: "This plugin has no exposed editor fields here. If its required settings are already saved in the host, you can still preview and synthesize.",
              })
              : t("tts.provider")}
        </div>
      )}

      {currentProviderMeta && !hasPreviewApi && (
        <div className="pb-2 text-xs text-muted-foreground">
          {t("tts.preview host upgrade required", {
            defaultValue: "Preview requires the Electron host to implement window.AIM.tts.synthesize(...).",
          })}
        </div>
      )}

      <div className="mb-1 text-sm mt-2">{t("tts.text")}</div>
      <Tabs value={target}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger className="px-1" value="original" onClick={() => handleTargetChange("original")}>
            {t("tts.original text")}
          </TabsTrigger>
          <TabsTrigger className="px-1" value="translate" onClick={() => handleTargetChange("translate")}>
            {t("tts.translate text")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2 mt-3">
        <Button className="flex-1" type="button" variant="outline" onClick={audition} disabled={!currentProviderMeta}>
          <span>{t("tts.audition", { defaultValue: "Audition" })}</span>
        </Button>
        {showConfirmButton && (
          <Button type="button" className="flex-1" onClick={addVoice} disabled={!currentProviderMeta}>
            <span>{t("app.sure")}</span>
          </Button>
        )}
      </div>

      {audioUrl && (
        <audio className="mt-3 w-full" controls src={audioUrl} />
      )}
    </>
  );
}));

export default TTSPanel;
