import { useCallback, useEffect, useRef, useState } from "react";
import { inject, observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { cloneDeep, isEqual, merge } from "lodash-es";
import { TbCheck, TbChevronLeft, TbChevronRight, TbLoader, TbSearch } from "react-icons/tb";

import type PluginStore from "@/app/stores/pluginStore";
import { translatePluginText } from "@/app/lib/plugin-i18n";
import {
  buildTTSSelection,
  findProviderEditorField,
  getDisplayFieldValue,
  getTTSHostErrorMessage,
  type MemoTTSEditorRole,
  type TTSTarget,
  type TTSProviderEditorField,
  type TTSSelection,
} from "@/app/lib/tts-plugin";
import {
  buildSelectedVoiceConfig,
  getBreadcrumb,
  getLoadingMenuItems,
  getMenuItems,
  getNextMenuPath,
  type MenuPath,
  type TTSMenuItem,
} from "@/app/lib/tts-mention";
import { cn } from "@/app/lib/utils";
import { toast } from "@/app/components/ui/use-toast";

import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export type VoiceOptions = TTSSelection;

interface TTSPanelProps {
  pluginStore?: PluginStore;
  getOptions?: (data: VoiceOptions) => void;
  getTarget?: (target: TTSTarget) => void;
  voiceOptions?: VoiceOptions;
  getVoiceOptions?: (options: VoiceOptions) => void;
  showConfirmButton?: boolean;
}

const PATH_ROLES: Array<Extract<MemoTTSEditorRole, "language" | "scene" | "model">> = ["language", "scene", "model"];

function findFieldByScopes(
  providerValue: string | undefined,
  pluginStore: PluginStore | undefined,
  role: MemoTTSEditorRole
) {
  if (!providerValue) {
    return undefined;
  }

  const providerMeta = pluginStore?.findTTSProviderByValue(providerValue);
  const manifest = providerMeta
    ? pluginStore?.findManifestByProviderValue(providerValue)
    : undefined;

  return findProviderEditorField(providerMeta, manifest, role, "segment")
    || findProviderEditorField(providerMeta, manifest, role, "card")
    || findProviderEditorField(providerMeta, manifest, role, "global")
    || findProviderEditorField(providerMeta, manifest, role);
}

function getFieldValueFromConfig(field: TTSProviderEditorField | undefined, config: Record<string, any> | undefined) {
  if (!field || !config || !(field.key in config)) {
    return undefined;
  }

  const rawValue = config[field.key];
  if (rawValue && typeof rawValue === "object") {
    if ("value" in rawValue && rawValue.value != null) {
      return rawValue.value;
    }
    if ("label" in rawValue && rawValue.label != null) {
      return rawValue.label;
    }
  }

  return rawValue;
}

function buildInitialMenuPath(
  providerValue: string,
  pluginStore: PluginStore | undefined,
  config: Record<string, any> | undefined
): MenuPath {
  const path: MenuPath = { provider: providerValue };

  PATH_ROLES.forEach((role) => {
    const field = findFieldByScopes(providerValue, pluginStore, role);
    const value = getFieldValueFromConfig(field, config);
    if (value != null && value !== "") {
      path[role] = String(value);
    }
  });

  return path;
}

function resolveDisplayLabel(
  providerValue: string | undefined,
  pluginStore: PluginStore | undefined,
  config: Record<string, any> | undefined,
  fallbackLabel?: string
) {
  if (fallbackLabel) {
    return fallbackLabel;
  }

  const voiceField = findFieldByScopes(providerValue, pluginStore, "voice");
  const providerMeta = providerValue
    ? pluginStore?.findTTSProviderByValue(providerValue)
    : undefined;
  const voiceValue = getFieldValueFromConfig(voiceField, config);

  if (voiceValue != null && voiceValue !== "") {
    const displayValue = getDisplayFieldValue(voiceField, voiceValue, providerMeta?.pluginId);
    if (displayValue) {
      return displayValue;
    }
  }

  return "";
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
  const [voiceLabel, setVoiceLabel] = useState<string>("");
  const [path, setPath] = useState<MenuPath>({});
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<TTSMenuItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>();

  const loadRequestIdRef = useRef(0);

  const currentProviderMeta = ttsProviders.find((item) => item.provider === provider);
  const currentManifest = currentProviderMeta
    ? memoPlugins?.installedPluginsManifests?.[currentProviderMeta.pluginId]
    : undefined;
  const currentProvider = currentProviderMeta?.provider;
  const synthesize = window.AIM?.tts?.synthesize;
  const hasPreviewApi = !!synthesize;
  const voiceField = findFieldByScopes(currentProvider, pluginStore, "voice");
  const selectedVoiceValue = getFieldValueFromConfig(voiceField, config);
  const currentProviderLabel = currentProviderMeta
    ? translatePluginText(currentProviderMeta.pluginId, currentProviderMeta.label, currentProviderMeta.label || currentProviderMeta.provider)
    : "";
  const breadcrumbs = getBreadcrumb(path.provider ? path : (currentProvider ? { provider: currentProvider } : {}));
  const canGoBack = !!(path.language || path.scene || path.model);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!currentProviderMeta) {
      setTarget("original");
      setConfig((prev) => (Object.keys(prev).length ? {} : prev));
      setVoiceLabel("");
      setPath({});
      setQuery("");
      setItems([]);
      setPickerOpen(false);
      return;
    }

    const version = memoPlugins?.localPlugins?.versions?.[currentProviderMeta.pluginId];
    const storedConfig = version
      ? cloneDeep(memoPlugins?.pluginsConfigurations?.[`${currentProviderMeta.pluginId}@${version}`] || {})
      : {};
    const runtimeConfig = cloneDeep(pluginStore?.getRuntimeTTSConfiguration(currentProviderMeta.provider) || {});
    const baseConfig = merge({}, currentManifest?.defaultsConfiguration || {}, storedConfig, runtimeConfig);
    const nextConfig = voiceOptions?.provider === currentProviderMeta.provider
      ? merge({}, baseConfig, cloneDeep(voiceOptions.config || {}))
      : baseConfig;
    const nextTarget = voiceOptions?.provider === currentProviderMeta.provider
      ? voiceOptions.target
      : "original";
    const nextVoiceLabel = resolveDisplayLabel(
      currentProviderMeta.provider,
      pluginStore,
      nextConfig,
      voiceOptions?.provider === currentProviderMeta.provider ? voiceOptions.displayLabel : undefined
    );
    const nextPath = buildInitialMenuPath(currentProviderMeta.provider, pluginStore, nextConfig);

    setTarget((prev) => (prev === nextTarget ? prev : nextTarget));
    setConfig((prev) => (isEqual(prev, nextConfig) ? prev : nextConfig));
    setVoiceLabel((prev) => (prev === nextVoiceLabel ? prev : nextVoiceLabel));
    setPath((prev) => (isEqual(prev, nextPath) ? prev : nextPath));
    setQuery((prev) => (prev === "" ? prev : ""));
    setPickerOpen((prev) => (nextVoiceLabel ? prev : true));
  }, [currentManifest, currentProviderMeta, memoPlugins, pluginStore, voiceOptions]);

  useEffect(() => {
    if (!currentProvider) {
      setItems([]);
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    const nextPath = path.provider ? path : { provider: currentProvider };

    setItems(getLoadingMenuItems());

    void getMenuItems(nextPath, query, currentProvider)
      .then((nextItems) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setItems(nextItems);
      })
      .catch(() => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setItems([]);
      });
  }, [currentProvider, path, query]);

  const buildSelection = useCallback((nextConfig = config, nextTarget = target, nextVoiceLabel = voiceLabel) => {
    if (!currentProviderMeta) {
      return undefined;
    }

    const selection = buildTTSSelection({
      providerMeta: currentProviderMeta,
      manifest: currentManifest,
      target: nextTarget,
      config: nextConfig,
    });
    const resolvedLabel = resolveDisplayLabel(currentProviderMeta.provider, pluginStore, nextConfig, nextVoiceLabel);

    return {
      ...selection,
      displayLabel: resolvedLabel || selection.displayLabel,
    } satisfies TTSSelection;
  }, [config, currentManifest, currentProviderMeta, pluginStore, target, voiceLabel]);

  useEffect(() => {
    if (!showConfirmButton) {
      const selection = buildSelection();
      if (selection) {
        getOptions?.(selection);
      }
    }
  }, [buildSelection, getOptions, showConfirmButton]);

  const handleTargetChange = (value: TTSTarget) => {
    setTarget(value);
    getTarget?.(value);
  };

  const handleVoiceItemSelect = useCallback((item: TTSMenuItem) => {
    if (item.disabled) {
      return;
    }

    const itemPath = (item.data?.menuPath as MenuPath | undefined) || path;
    const nextPath = getNextMenuPath(itemPath, item);
    if (nextPath) {
      setPath(nextPath);
      setQuery("");
      return;
    }

    if (item.type !== "voice" || !currentProviderMeta) {
      return;
    }

    const selectedConfig = buildSelectedVoiceConfig(itemPath, item);
    if (!selectedConfig) {
      return;
    }

    const nextConfig = cloneDeep(selectedConfig.config || {});
    const nextVoiceLabel = selectedConfig.displayLabel || item.label;

    setConfig((prev) => (isEqual(prev, nextConfig) ? prev : nextConfig));
    setVoiceLabel((prev) => (prev === nextVoiceLabel ? prev : nextVoiceLabel));
    setPath(buildInitialMenuPath(currentProviderMeta.provider, pluginStore, nextConfig));
    setQuery("");
    setPickerOpen(false);

    if (!showConfirmButton) {
      const selection = buildSelection(nextConfig, target, nextVoiceLabel);
      if (selection) {
        getOptions?.(selection);
      }
    }
  }, [buildSelection, currentProviderMeta, getOptions, path, pluginStore, showConfirmButton, target]);

  const handleGoBack = () => {
    if (!canGoBack) {
      return;
    }

    if (path.model) {
      setPath((prev) => ({ ...prev, model: undefined }));
      setQuery("");
      return;
    }

    if (path.scene) {
      setPath((prev) => ({ ...prev, scene: undefined }));
      setQuery("");
      return;
    }

    if (path.language) {
      setPath((prev) => ({ ...prev, language: undefined }));
      setQuery("");
    }
  };

  const confirmVoiceSelection = () => {
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
        text: "Welcome to memo",
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
    }
  };

  return (
    <>
      {!ttsProviders.length && (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {t("tts.no plugin providers", {
            defaultValue: "No TTS plugins are available. Install a host TTS plugin to continue.",
          })}
        </div>
      )}

      {!!ttsProviders.length && !currentProviderMeta && (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {t("tts.provider", { defaultValue: "TTS provider" })}
        </div>
      )}

      {currentProviderMeta && (
        <>
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">
              {t("tts.provider", { defaultValue: "TTS provider" })}
            </div>
            <div className="mt-1 text-sm font-medium">
              {currentProviderLabel}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {t("tts.inline voice editor notice", {
                defaultValue: "This panel now focuses on choosing the plugin voice. Other required plugin settings still come from the host configuration.",
              })}
            </div>
          </div>

          <div className="mt-3 rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {t("tts.voice", { defaultValue: "Voice" })}
                </div>
                <div className="mt-1 truncate text-sm font-medium">
                  {voiceLabel || t("tts.host default voice", {
                    defaultValue: "Use the host-saved default voice",
                  })}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => setPickerOpen((prev) => !prev)}>
                <span>{pickerOpen
                  ? t("app.close", { defaultValue: "Close" })
                  : t("tts.choose voice", { defaultValue: "Choose voice" })}
                </span>
              </Button>
            </div>

            {pickerOpen && (
              <div className="mt-3 rounded-md border">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <TbSearch className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("tts.search", { defaultValue: "Search..." })}
                    className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {breadcrumbs.length
                      ? breadcrumbs.join(" / ")
                      : currentProviderLabel}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleGoBack} disabled={!canGoBack}>
                    <TbChevronLeft className="mr-1 h-4 w-4" />
                    <span>{t("app.back", { defaultValue: "Back" })}</span>
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto p-1">
                  {!items.length && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {t("tts.no results")}
                    </div>
                  )}

                  {items.map((item) => {
                    const nextPath = getNextMenuPath((item.data?.menuPath as MenuPath | undefined) || path, item);
                    const isSelectedVoice = item.type === "voice"
                      && selectedVoiceValue != null
                      && String(item.data?.value) === String(selectedVoiceValue);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors",
                          item.disabled
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-accent hover:text-accent-foreground",
                          isSelectedVoice && "bg-accent text-accent-foreground"
                        )}
                        disabled={item.disabled}
                        onClick={() => handleVoiceItemSelect(item)}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.data?.loading && <TbLoader className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!item.data?.loading && isSelectedVoice && <TbCheck className="h-4 w-4" />}
                        {!item.data?.loading && !isSelectedVoice && nextPath && <TbChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {currentProviderMeta && !hasPreviewApi && (
        <div className="pb-2 pt-3 text-xs text-muted-foreground">
          {t("tts.preview host upgrade required", {
            defaultValue: "Preview requires the Electron host to implement window.AIM.tts.synthesize(...).",
          })}
        </div>
      )}

      <div className="mb-1 mt-3 text-sm">{t("tts.text")}</div>
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

      <div className="mt-3 flex gap-2">
        <Button className="flex-1" type="button" variant="outline" onClick={audition} disabled={!currentProviderMeta}>
          <span>{t("tts.audition", { defaultValue: "Audition" })}</span>
        </Button>
        {showConfirmButton && (
          <Button type="button" className="flex-1" onClick={confirmVoiceSelection} disabled={!currentProviderMeta}>
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
