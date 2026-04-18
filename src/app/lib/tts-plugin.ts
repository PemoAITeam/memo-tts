import type { Manifest, ManifestConfiguration, PluginReturnType } from "@aim-packages/plugin-manager";
import { translatePluginText } from "@/app/lib/plugin-i18n";

export type TTSTarget = "original";
export type TTSConfigScope = "global" | "card" | "segment";

export interface MemoTTSEditorFieldMeta {
  scope: TTSConfigScope[];
  role?: "voice" | "speed" | "emotion" | "model" | "language" | "scene";
}

export interface MemoTTSEditorMeta {
  version: 1;
  displayField?: string;
  fields: Record<string, MemoTTSEditorFieldMeta>;
}

export type MemoTTSEditorRole = NonNullable<MemoTTSEditorFieldMeta["role"]>;

export interface TTSProviderFieldOption {
  value: string | number;
  label: string;
  description?: string;
  raw?: Record<string, any>;
}

export interface TTSProviderFieldOptionRequest {
  provider: string;
  pluginId: string;
  fieldKey: string;
  role?: MemoTTSEditorRole;
  scope?: TTSConfigScope;
  config?: Record<string, any>;
  query?: string;
}

export interface TTSProviderFieldOptionResult {
  field?: TTSProviderEditorField;
  options: TTSProviderFieldOption[];
  source: "static" | "dynamic" | "runtime" | "none";
}

export interface TTSProviderEditorField {
  key: string;
  label: string;
  type: string;
  role?: MemoTTSEditorRole;
  scope: TTSConfigScope[];
  options: TTSProviderFieldOption[];
  range?: {
    min: number;
    max: number;
    step: number;
  };
  useI18nOptions?: boolean;
  placeholder?: string;
  description?: string;
  raw: ManifestConfiguration;
}

export interface TTSProviderMeta {
  provider: string;
  pluginId: string;
  label: string;
  disabled?: boolean;
  version?: string;
  configurationExposed: string[];
  configurationRequired: string[];
  configurationStorage?: string[];
  ttsInput?: string[];
  editor?: MemoTTSEditorMeta;
}

export interface TTSSelection {
  schemaVersion: 2;
  provider: string;
  pluginId: string;
  target: TTSTarget;
  config: Record<string, any>;
  displayLabel: string;
  editorFields?: Partial<Record<MemoTTSEditorRole, string>>;
  legacy?: boolean;
  legacyService?: string;
}

export interface TTSMergeItem {
  text: string;
  md5: string;
  options: Record<string, any>;
  textChunks?: string[];
}

export interface TTSMergePayload {
  mode: "plugin";
  provider: string;
  pluginId: string;
  data: TTSMergeItem[];
}

const DEFAULT_TTS_HOST_ERROR_MESSAGE = "The Electron host does not support the plugin TTS API yet.";

type ManifestWithEditorMeta = Manifest & {
  memoTtsEditor?: MemoTTSEditorMeta;
};

function normalizeFieldKey(key: string) {
  return key.replace(/[_-]/g, "").toLowerCase();
}

function inferEditorFieldRole(
  key: string,
  explicitRole?: MemoTTSEditorRole
): MemoTTSEditorRole | undefined {
  if (explicitRole) {
    return explicitRole;
  }

  const normalizedKey = normalizeFieldKey(key);

  if (
    normalizedKey.includes("voice") ||
    normalizedKey.includes("speaker")
  ) {
    return "voice";
  }

  if (
    normalizedKey === "speed" ||
    normalizedKey === "rate" ||
    normalizedKey.includes("speed")
  ) {
    return "speed";
  }

  if (normalizedKey.includes("emotion")) {
    return "emotion";
  }

  if (normalizedKey.includes("model")) {
    return "model";
  }

  if (
    normalizedKey === "lang" ||
    normalizedKey.includes("language") ||
    normalizedKey.includes("locale")
  ) {
    return "language";
  }

  if (normalizedKey.includes("scene") || normalizedKey.includes("style")) {
    return "scene";
  }

  return undefined;
}

function getDefaultFieldScope(role?: MemoTTSEditorRole): TTSConfigScope[] {
  if (role === "voice") {
    return ["global", "card", "segment"];
  }

  if (role === "speed" || role === "emotion") {
    return ["global", "card", "segment"];
  }

  return ["global", "card"];
}

function getManifestEditorMeta(manifest?: Manifest): MemoTTSEditorMeta | undefined {
  return (manifest as ManifestWithEditorMeta | undefined)?.memoTtsEditor;
}

function normalizeTTSTarget(target?: unknown): TTSTarget {
  void target;
  return "original";
}

const RECOMMENDED_TTS_PROVIDER_ORDER = [
  "edge",
  "elevenlabs",
  "volcengine",
];

/**
 * 可见的TTS提供商白名单
 * 如果列表为空，则显示所有提供商
 * 如果列表不为空，则只显示列表中匹配的提供商
 */
const VISIBLE_TTS_PROVIDERS = [
  "edge",
  // "elevenlabs",
  "volcengine",
];

function isProviderVisible(provider: Pick<TTSProviderMeta, "provider" | "pluginId" | "label">) {
  if (VISIBLE_TTS_PROVIDERS.length === 0) {
    return true;
  }

  const searchSource = [
    provider.provider,
    provider.pluginId,
    provider.label,
  ].map((item) => normalizeProviderSortKey(item)).join(" ");

  return VISIBLE_TTS_PROVIDERS.some((item) =>
    searchSource.includes(normalizeProviderSortKey(item))
  );
}

function normalizeProviderSortKey(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getRecommendedProviderOrder(provider: Pick<TTSProviderMeta, "provider" | "pluginId" | "label">) {
  const sortSource = [
    provider.provider,
    provider.pluginId,
    provider.label,
  ].map((item) => normalizeProviderSortKey(item)).join(" ");

  const matchedIndex = RECOMMENDED_TTS_PROVIDER_ORDER.findIndex((item) =>
    sortSource.includes(normalizeProviderSortKey(item))
  );

  return matchedIndex === -1
    ? RECOMMENDED_TTS_PROVIDER_ORDER.length
    : matchedIndex;
}

function compareTTSProviders(left: TTSProviderMeta, right: TTSProviderMeta) {
  const leftPriority = getRecommendedProviderOrder(left);
  const rightPriority = getRecommendedProviderOrder(right);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  if (!!left.disabled !== !!right.disabled) {
    return left.disabled ? 1 : -1;
  }

  const leftLabel = normalizeProviderSortKey(left.label || left.provider);
  const rightLabel = normalizeProviderSortKey(right.label || right.provider);
  const labelCompare = leftLabel.localeCompare(rightLabel);
  if (labelCompare !== 0) {
    return labelCompare;
  }

  const providerCompare = normalizeProviderSortKey(left.provider).localeCompare(normalizeProviderSortKey(right.provider));
  if (providerCompare !== 0) {
    return providerCompare;
  }

  return normalizeProviderSortKey(left.pluginId).localeCompare(normalizeProviderSortKey(right.pluginId));
}

export function getTTSProviderMetaList(memoPlugins?: PluginReturnType): TTSProviderMeta[] {
  if (!memoPlugins?.pluginProviders?.length) {
    return [];
  }

  const versions = memoPlugins.localPlugins?.versions || {};

  return memoPlugins.pluginProviders
    .filter((provider) => provider.type === "tts")
    .map((provider) => {
      const manifest = memoPlugins.installedPluginsManifests?.[provider.pluginId];
      return {
        provider: provider.value,
        pluginId: provider.pluginId,
        label: provider.label,
        disabled: provider.disabled,
        version: versions[provider.pluginId],
        configurationExposed: manifest?.configurationExposed || [],
        configurationRequired: manifest?.configurationRequired || [],
        configurationStorage: manifest?.configurationStorage || [],
        ttsInput: manifest?.ttsInput || [],
        editor: getManifestEditorMeta(manifest),
      };
    })
    .filter(isProviderVisible)
    .sort(compareTTSProviders);
}

export function getProviderEditorFields(
  providerMeta: TTSProviderMeta | undefined,
  manifest?: Manifest
): TTSProviderEditorField[] {
  if (!providerMeta || !manifest?.configuration?.length) {
    return [];
  }

  const editorMeta = getManifestEditorMeta(manifest);
  const exposedKeys = providerMeta.configurationExposed?.length
    ? new Set(providerMeta.configurationExposed)
    : undefined;

  return manifest.configuration
    .filter((configuration) => !exposedKeys || exposedKeys.has(configuration.key))
    .map((configuration) => {
      const fieldMeta = editorMeta?.fields?.[configuration.key];
      const role = inferEditorFieldRole(configuration.key, fieldMeta?.role);

      return {
        key: configuration.key,
        label: configuration.label || configuration.key,
        type: String((configuration as Record<string, any>).type || "text"),
        role,
        scope: fieldMeta?.scope?.length ? fieldMeta.scope : getDefaultFieldScope(role),
        options: (configuration.options || []).map((option) => ({
          value: option.value,
          label: option.label,
          raw: option as Record<string, any>,
        })),
        range: configuration.range,
        useI18nOptions: configuration.useI18nOptions,
        placeholder: configuration.placeholder,
        description: configuration.description,
        raw: configuration,
      };
    });
}

export function findProviderEditorField(
  providerMeta: TTSProviderMeta | undefined,
  manifest: Manifest | undefined,
  role: MemoTTSEditorRole,
  scope?: TTSConfigScope
) {
  return getProviderEditorFields(providerMeta, manifest).find((field) => {
    if (field.role !== role) {
      return false;
    }

    if (scope && !field.scope.includes(scope)) {
      return false;
    }

    return true;
  });
}

export function getProviderEditorFieldKeyMap(
  providerMeta: TTSProviderMeta | undefined,
  manifest: Manifest | undefined,
  scope?: TTSConfigScope
) {
  return getProviderEditorFields(providerMeta, manifest).reduce<Partial<Record<MemoTTSEditorRole, string>>>((result, field) => {
    if (scope && !field.scope.includes(scope)) {
      return result;
    }

    if (field.role && !result[field.role]) {
      result[field.role] = field.key;
    }

    return result;
  }, {});
}

export function supportsProviderEditorRole(
  providerMeta: TTSProviderMeta | undefined,
  manifest: Manifest | undefined,
  role: MemoTTSEditorRole,
  scope?: TTSConfigScope
) {
  return !!findProviderEditorField(providerMeta, manifest, role, scope);
}

export function getFieldDisplayValue(
  field: TTSProviderEditorField | undefined,
  value: unknown,
  languagePrefix?: string
) {
  if (value == null) {
    return "";
  }

  const matchedOption = field?.options.find((option) => option.value === value || String(option.value) === String(value));
  if (matchedOption) {
    return translatePluginText(languagePrefix, matchedOption.label, matchedOption.label);
  }

  return String(value);
}

export function getFieldChoiceOptions(field: TTSProviderEditorField | undefined) {
  if (!field) {
    return [];
  }

  if (field.options.length) {
    return field.options;
  }

  if (field.role === "speed" && field.range) {
    const { min, max, step } = field.range;
    const isRateField = normalizeFieldKey(field.key) === "rate";
    const presets = isRateField
      ? [0, 20, 40, 60, 80, 100]
      : [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

    return presets
      .filter((value) => value >= min && value <= max)
      .filter((value) => {
        const precision = step >= 1 ? 0 : String(step).split(".")[1]?.length || 0;
        const normalized = Number(value.toFixed(precision));
        const distance = Math.abs((normalized - min) / step);
        return Number.isFinite(distance) && Math.abs(distance - Math.round(distance)) < 0.00001;
      })
      .map((value) => ({
        value,
        label: isRateField ? String(value) : `${value}x`,
      }));
  }

  return [];
}

function findProviderEditorFieldByKey(
  providerMeta: TTSProviderMeta | undefined,
  manifest: Manifest | undefined,
  key?: string
) {
  if (!key) {
    return undefined;
  }

  return getProviderEditorFields(providerMeta, manifest).find((field) => field.key === key);
}

function getConfigFieldDisplayValue(
  config: Record<string, any>,
  providerMeta: TTSProviderMeta | undefined,
  manifest: Manifest | undefined,
  fieldKey?: string
) {
  if (!fieldKey || !(fieldKey in config)) {
    return "";
  }

  const rawValue = config[fieldKey];
  const field = findProviderEditorFieldByKey(providerMeta, manifest, fieldKey);

  if (rawValue && typeof rawValue === "object") {
    if ("label" in rawValue && rawValue.label) {
      const rawLabel = String(rawValue.label);
      return translatePluginText(providerMeta?.pluginId, rawLabel, rawLabel);
    }

    if ("value" in rawValue && rawValue.value != null) {
      return getFieldDisplayValue(field, rawValue.value, providerMeta?.pluginId);
    }
  }

  return getFieldDisplayValue(field, rawValue, providerMeta?.pluginId);
}

export function normalizeProviderFieldOptions(value: unknown): TTSProviderFieldOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<TTSProviderFieldOption[]>((result, item) => {
      if (item == null) {
        return result;
      }

      if (typeof item === "string" || typeof item === "number") {
        result.push({
          value: item,
          label: String(item),
        });
        return result;
      }

      if (typeof item !== "object") {
        return result;
      }

      const option = item as Record<string, any>;
      const rawValue = option.value ?? option.id ?? option.key ?? option.code;
      if (rawValue == null) {
        return result;
      }

      result.push({
        value: rawValue,
        label: String(option.label ?? option.name ?? rawValue),
        description: option.description ? String(option.description) : undefined,
        raw: option,
      });

      return result;
    }, []);
}

export async function getProviderFieldChoiceOptions(args: {
  providerMeta?: TTSProviderMeta;
  manifest?: Manifest;
  role: MemoTTSEditorRole;
  scope?: TTSConfigScope;
  config?: Record<string, any>;
  query?: string;
}): Promise<TTSProviderFieldOptionResult> {
  const {
    providerMeta,
    manifest,
    role,
    scope,
    config,
    query,
  } = args;
  const field = providerMeta
    ? findProviderEditorField(providerMeta, manifest, role, scope) || findProviderEditorField(providerMeta, manifest, role)
    : undefined;

  return getProviderEditorFieldOptions({
    providerMeta,
    field,
    config,
    query,
    scope,
  });
}

export async function getProviderEditorFieldOptions(args: {
  providerMeta?: TTSProviderMeta;
  field?: TTSProviderEditorField;
  config?: Record<string, any>;
  query?: string;
  scope?: TTSConfigScope;
}): Promise<TTSProviderFieldOptionResult> {
  const {
    providerMeta,
    field,
    config,
    query,
    scope,
  } = args;

  if (!field || !providerMeta) {
    return {
      field,
      options: [],
      source: "none",
    };
  }

  const staticOptions = getFieldChoiceOptions(field);
  if (staticOptions.length) {
    return {
      field,
      options: staticOptions,
      source: "static",
    };
  }

  if (window.AIM?.tts?.getPluginEditorOptions) {
    try {
      const dynamicOptions = normalizeProviderFieldOptions(await window.AIM.tts.getPluginEditorOptions({
        provider: providerMeta.provider,
        pluginId: providerMeta.pluginId,
        fieldKey: field.key,
        role: field.role,
        scope,
        config,
        query,
      }));

      if (dynamicOptions.length) {
        return {
          field,
          options: dynamicOptions,
          source: "dynamic",
        };
      }
    } catch (error) {
      console.warn("[tts-plugin] failed to load dynamic field options", {
        provider: providerMeta.provider,
        fieldKey: field.key,
        role: field.role,
        scope,
        error,
      });
    }
  }

  const runtimeValue = config?.[field.key];
  if (runtimeValue != null && runtimeValue !== "") {
    return {
      field,
      options: [{
        value: runtimeValue,
        label: getFieldDisplayValue(field, runtimeValue, providerMeta.pluginId),
      }],
      source: "runtime",
    };
  }

  return {
    field,
    options: [],
    source: "none",
  };
}

export function findTTSProviderMeta(
  providers: TTSProviderMeta[],
  providerValue?: string | null
): TTSProviderMeta | undefined {
  if (!providerValue) {
    return undefined;
  }
  return providers.find((provider) => provider.provider === providerValue);
}

export function getDisplayFieldValue(
  config: Record<string, any> | undefined,
  providerMeta?: TTSProviderMeta,
  manifest?: Manifest
) {
  if (!config) {
    return "";
  }

  const displayField = providerMeta?.editor?.displayField
    || findProviderEditorField(providerMeta, manifest, "voice")?.key;
  const displayValue = getConfigFieldDisplayValue(config, providerMeta, manifest, displayField);
  if (displayValue) {
    return displayValue;
  }

  const fallbackFieldKeys = ["voiceName", "voice", "voiceType", "model"];
  for (const fieldKey of fallbackFieldKeys) {
    const fieldValue = getConfigFieldDisplayValue(config, providerMeta, manifest, fieldKey);
    if (fieldValue) {
      return fieldValue;
    }
  }

  const rawValue = displayField ? config[displayField] : undefined;
  const fallbackValue = rawValue ?? config.voiceName ?? config.voice ?? config.voiceType ?? config.model;

  if (fallbackValue == null) {
    return providerMeta?.label || providerMeta?.provider || "";
  }

  if (typeof fallbackValue === "object") {
    if ("label" in fallbackValue && fallbackValue.label) {
      const rawLabel = String(fallbackValue.label);
      return translatePluginText(providerMeta?.pluginId, rawLabel, rawLabel);
    }
    if ("value" in fallbackValue && fallbackValue.value) {
      return String(fallbackValue.value);
    }
  }

  if (typeof fallbackValue === "string" || typeof fallbackValue === "number") {
    return String(fallbackValue);
  }

  return providerMeta?.label || providerMeta?.provider || "";
}

export function buildTTSSelection(args: {
  providerMeta: TTSProviderMeta;
  manifest?: Manifest;
  target?: TTSTarget | string;
  config: Record<string, any> | undefined;
}): TTSSelection {
  const { providerMeta, manifest, target, config } = args;
  const normalizedConfig = config ? { ...config } : {};

  return {
    schemaVersion: 2,
    provider: providerMeta.provider,
    pluginId: providerMeta.pluginId,
    target: normalizeTTSTarget(target),
    config: normalizedConfig,
    displayLabel: getDisplayFieldValue(normalizedConfig, providerMeta, manifest),
    editorFields: getProviderEditorFieldKeyMap(providerMeta, manifest, "segment"),
  };
}

export function mergePluginConfigLayers(
  ...layers: Array<Record<string, any> | null | undefined>
) {
  return layers.reduce<Record<string, any>>((result, layer) => {
    if (!layer) {
      return result;
    }

    return {
      ...result,
      ...layer,
    };
  }, {});
}

const LEGACY_PROVIDER_VALUE_MAP: Record<string, string> = {
  Edge: "Edge TTS",
  "Edge TTS": "Edge TTS",
  OpenAI: "OpenAI TTS",
  "OpenAI TTS": "OpenAI TTS",
  Volcano: "Volcengine TTS",
  Volc: "Volcengine TTS",
  "Volcengine TTS": "Volcengine TTS",
};

function getLegacyProviderValue(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return LEGACY_PROVIDER_VALUE_MAP[value] || value;
}

function getLegacyPluginId(provider: string) {
  return `legacy:${provider.replace(/\s+/g, "-").toLowerCase()}`;
}

function normalizeLegacyEdgeRate(speed: unknown) {
  switch (String(speed ?? "1")) {
    case "0.5":
      return -30;
    case "0.75":
      return -15;
    case "1":
      return 0;
    case "1.5":
      return 15;
    case "2":
      return 30;
    case "3":
      return 60;
    case "4":
      return 100;
    default:
      if (typeof speed === "number" && Number.isFinite(speed)) {
        return speed;
      }
      return undefined;
  }
}

function normalizeLegacyOpenAISpeed(speed: unknown) {
  const numericSpeed = Number(speed);
  return Number.isFinite(numericSpeed) ? numericSpeed : undefined;
}

function cleanLegacyConfig(config: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function getLegacyVoiceValue(voice: any) {
  if (!voice) {
    return undefined;
  }

  if (typeof voice === "string") {
    return voice;
  }

  return voice.value ?? voice.shortName ?? voice.voiceName;
}

function getLegacyEmotionValue(emotion: any) {
  if (!emotion) {
    return undefined;
  }

  if (typeof emotion === "string") {
    return emotion === "none" ? undefined : emotion;
  }

  const value = emotion.value ?? emotion.label;
  return value === "none" ? undefined : value;
}

function getLegacySelectionDisplayLabel(provider: string, source: Record<string, any>) {
  if (source.displayLabel) {
    return String(source.displayLabel);
  }

  if (source.voiceLocalName) {
    return String(source.voiceLocalName);
  }

  if (provider === "Edge TTS") {
    return String(
      source.voiceLocalName
      || source.voice?.properties?.LocalName
      || source.voice?.properties?.DisplayName
      || source.voiceName
      || source.voice?.shortName
      || ""
    );
  }

  if (provider === "OpenAI TTS") {
    return String(
      source.voiceLocalName
      || source.voice?.label
      || source.voice
      || source.voiceName
      || ""
    );
  }

  if (provider === "Volcengine TTS") {
    return String(
      source.voiceLocalName
      || source.voice?.label
      || source.voiceType
      || source.voice_type
      || ""
    );
  }

  return "";
}

function normalizeLegacySelectionConfig(provider: string, source: Record<string, any>) {
  if (provider === "Edge TTS") {
    return cleanLegacyConfig({
      language: source.language ?? source.lang,
      voiceName: source.voiceName ?? source.voice?.shortName ?? source.voice?.value ?? getLegacyVoiceValue(source.voice),
      rate: source.rate ?? normalizeLegacyEdgeRate(source.speed),
    });
  }

  if (provider === "OpenAI TTS") {
    return cleanLegacyConfig({
      model: source.model,
      voice: source.voice?.value ?? source.voice ?? source.voiceName,
      speed: typeof source.speed === "number" ? source.speed : normalizeLegacyOpenAISpeed(source.speed),
    });
  }

  if (provider === "Volcengine TTS") {
    return cleanLegacyConfig({
      scene: source.scene ?? source.scenes,
      voiceType: source.voiceType ?? source.voice_type ?? source.voice?.value,
      emotion: getLegacyEmotionValue(source.emotion),
    });
  }

  return cleanLegacyConfig({
    ...source.config,
    language: source.language ?? source.lang,
    scene: source.scene ?? source.scenes,
    voiceName: source.voiceName,
    voiceType: source.voiceType ?? source.voice_type,
    voice: getLegacyVoiceValue(source.voice) ?? source.voice,
    model: source.model,
    speed: source.speed,
    rate: source.rate,
    emotion: getLegacyEmotionValue(source.emotion) ?? source.emotion,
  });
}

function buildLegacyTTSSelection(value: Record<string, any>) {
  const rawProvider = value.service || value.provider || value.type;
  const provider = getLegacyProviderValue(rawProvider);
  if (!provider) {
    return undefined;
  }

  const source = value.ttsOptions && typeof value.ttsOptions === "object"
    ? {
      ...value.ttsOptions,
      speed: value.speed ?? value.ttsOptions.speed,
      target: value.target ?? value.ttsOptions.target,
      displayLabel: value.displayLabel,
      voiceLocalName: value.voiceLocalName ?? value.ttsOptions.voiceLocalName,
    }
    : value;

  return {
    schemaVersion: 2,
    provider,
    pluginId: getLegacyPluginId(provider),
    target: normalizeTTSTarget(value.target ?? source.target),
    config: normalizeLegacySelectionConfig(provider, source),
    displayLabel: getLegacySelectionDisplayLabel(provider, source),
    legacy: true,
    legacyService: String(rawProvider),
  } satisfies TTSSelection;
}

export function isLegacyTTSSelection(selection: Pick<TTSSelection, "pluginId"> & Partial<Pick<TTSSelection, "legacy">> | null | undefined) {
  if (!selection) {
    return false;
  }

  return !!selection.legacy || String(selection.pluginId || "").startsWith("legacy:");
}

export function resolveStoredTTSSelection(
  selection: TTSSelection | undefined,
  providerMeta?: TTSProviderMeta,
  manifest?: Manifest
) {
  if (!selection || !providerMeta || selection.provider !== providerMeta.provider) {
    return selection;
  }

  const nextEditorFields = getProviderEditorFieldKeyMap(providerMeta, manifest, "segment");
  const mergedEditorFields = Object.keys(nextEditorFields).length
    ? {
      ...selection.editorFields,
      ...nextEditorFields,
    }
    : selection.editorFields;

  return {
    schemaVersion: selection.schemaVersion,
    provider: selection.provider,
    pluginId: providerMeta.pluginId,
    config: selection.config,
    displayLabel: selection.displayLabel,
    target: normalizeTTSTarget(selection.target),
    editorFields: mergedEditorFields,
  } satisfies TTSSelection;
}

export function isSameProviderSelection(
  selection: (Pick<TTSSelection, "provider" | "pluginId"> & Partial<Pick<TTSSelection, "legacy">>) | null | undefined,
  candidate: (Pick<TTSSelection, "provider" | "pluginId"> & Partial<Pick<TTSSelection, "legacy">>) | null | undefined
) {
  if (!selection || !candidate) {
    return false;
  }

  if (selection.provider !== candidate.provider) {
    return false;
  }

  if (isLegacyTTSSelection(selection) || isLegacyTTSSelection(candidate)) {
    return true;
  }

  return selection.pluginId === candidate.pluginId;
}

export function parseStoredTTSSelection(value: any): TTSSelection | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (value.schemaVersion === 2 && value.provider && value.pluginId && value.config) {
    return {
      ...value,
      target: normalizeTTSTarget(value.target),
    } as TTSSelection;
  }

  return buildLegacyTTSSelection(value);
}

function normalizeVoiceLabel(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number") {
    const label = String(value).trim();
    return label || undefined;
  }

  if (typeof value !== "object") {
    return undefined;
  }

  const source = value as Record<string, any>;
  const candidates = [
    source.displayLabel,
    source.voiceLocalName,
    source.label,
    source.voice?.label,
    source.voice?.properties?.LocalName,
    source.voice?.properties?.DisplayName,
    source.voiceName,
    source.voice?.shortName,
    source.voice,
    source.voiceType,
    source.model,
  ];

  for (const candidate of candidates) {
    const label = normalizeVoiceLabel(candidate);
    if (label) {
      return label;
    }
  }

  if (source.config && typeof source.config === "object") {
    return normalizeVoiceLabel(source.config);
  }

  return undefined;
}

function pushUniqueVoiceLabel(labels: string[], value: unknown) {
  const label = normalizeVoiceLabel(value);
  if (!label || labels.includes(label)) {
    return;
  }

  labels.push(label);
}

function parseMentionVoiceConfig(config: unknown): Record<string, any> | null {
  if (!config) {
    return null;
  }

  if (typeof config === "string") {
    try {
      return JSON.parse(config) as Record<string, any>;
    } catch {
      return null;
    }
  }

  if (typeof config === "object") {
    return config as Record<string, any>;
  }

  return null;
}

function collectVoiceLabelsFromEditorNode(node: any, labels: string[]) {
  if (!node || typeof node !== "object") {
    return;
  }

  if (node.type === "editorCard") {
    pushUniqueVoiceLabel(labels, node.attrs?.voice);
  }

  if (node.type === "ttsMention") {
    pushUniqueVoiceLabel(labels, node.attrs?.label);
    pushUniqueVoiceLabel(labels, parseMentionVoiceConfig(node.attrs?.config));
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => collectVoiceLabelsFromEditorNode(child, labels));
  }
}

export function getTemoVoiceLabels(source: {
  ttsOptions?: unknown;
  editorData?: unknown;
  voiceLocalName?: unknown;
}) {
  const labels: string[] = [];
  const selection = parseStoredTTSSelection(source.ttsOptions);
  const editorContent = Array.isArray(source.editorData)
    ? source.editorData
    : Array.isArray((source.editorData as Record<string, any> | undefined)?.content)
      ? (source.editorData as Record<string, any>).content
      : [];

  pushUniqueVoiceLabel(labels, selection?.displayLabel);
  pushUniqueVoiceLabel(labels, source.voiceLocalName);
  editorContent.forEach((item: any) => collectVoiceLabelsFromEditorNode(item, labels));

  return labels;
}

function matchesTTSSelectionCandidate(
  candidate: { provider?: string | null; pluginId?: string | null; legacy?: boolean },
  selection?: Pick<TTSSelection, "provider" | "pluginId"> & Partial<Pick<TTSSelection, "legacy">>
) {
  if (!selection) {
    return true;
  }

  if (candidate.provider && candidate.provider !== selection.provider) {
    return false;
  }

  if (!candidate.pluginId || !selection.pluginId) {
    return true;
  }

  if (
    isLegacyTTSSelection({ pluginId: candidate.pluginId, legacy: candidate.legacy })
    || isLegacyTTSSelection(selection)
  ) {
    return true;
  }

  return candidate.pluginId === selection.pluginId;
}

export function getTTSSelectionConfig(
  value: unknown,
  selection?: Pick<TTSSelection, "provider" | "pluginId"> & Partial<Pick<TTSSelection, "legacy">>
) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, any>;
  if (candidate.config && typeof candidate.config === "object") {
    if (!matchesTTSSelectionCandidate(candidate, selection)) {
      return undefined;
    }

    return candidate.config as Record<string, any>;
  }

  const parsedSelection = parseStoredTTSSelection(candidate);
  if (parsedSelection) {
    if (!matchesTTSSelectionCandidate(parsedSelection, selection)) {
      return undefined;
    }

    return parsedSelection.config;
  }

  if (selection && candidate.provider && candidate.provider !== selection.provider) {
    return undefined;
  }

  const rest = { ...candidate };
  delete rest.provider;
  delete rest.pluginId;
  delete rest.schemaVersion;
  delete rest.displayLabel;
  delete rest.target;
  delete rest.ttsOptions;
  delete rest.rawData;
  delete rest.legacy;
  delete rest.legacyService;

  return Object.keys(rest).length ? rest : undefined;
}

export function getTTSHostErrorMessage(
  error: unknown,
  fallbackMessage = DEFAULT_TTS_HOST_ERROR_MESSAGE
) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "";

    if (message.trim()) {
      return message;
    }
  }

  return fallbackMessage;
}
