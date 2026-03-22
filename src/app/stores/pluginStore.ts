import { compareVersions } from "compare-versions";
import { cloneDeep, isEqual } from "lodash-es";
import { Plugin, PluginProvider, PluginReturnType } from "memo-plugin-manager";
import { autorun, IReactionDisposer, makeAutoObservable, reaction, runInAction, when } from "mobx";

import { customEvents, eventBus } from "@/events/eventBus";
import { findTTSProviderMeta, getTTSProviderMetaList, type TTSProviderMeta } from "@/app/lib/tts-plugin";

import { settingStore } from "./";

export interface MemoPluginsRefresh {
  type: "memo:plugins:refresh";
  data: PluginReturnType;
}

class PluginStore {
  memoPlugins: PluginReturnType | undefined;
  needUpdateCount: number = 0;

  /**
   * 当前选中的插件，用于检查选中插件的必填项
   */
  checkPlugin: Plugin | undefined;
  showCheckInline: boolean = false;
  showPluginConfiguration = false;

  constructor() {
    makeAutoObservable(this);
    autorun(async () => {
      // 在这里执行你的代码逻辑
      console.log("Plugin autorun");
    });

    when(
      () => !!settingStore, // mobx.when函数可以在满足指定条件时执行回调函数。可以在回调函数中创建监听。
      () => {
        // 条件满足时执行的回调函数
        // 在这里检查是否已经注册了监听
        if (!this.reactionDisposer) {
          this.reactionDisposer = reaction(
            // 检测语言设置完成
            () => settingStore.i18nInit,
            async (value, oldValue) => {
              if (value) {
                console.log("%cPLUGINS%c语言设置完成，开始读取插件", "color: #FFFFFF; background: #0066ff; padding: 4px; font-weight: bold;", "color: #000000; background: #FFFFFF; padding: 4px", value, oldValue);
                window.AIM.plugin.readLocalPlugins().then(res => {
                  if (res) {
                    runInAction(() => {
                      console.log("%cPLUGINS%c读取插件结果", "color: #FFFFFF; background: #0066ff; padding: 4px; font-weight: bold;", "color: #000000; background: #FFFFFF; padding: 4px", res);
                      this.needUpdateCount = this.checkPluginsVersion(res);
                      this.memoPlugins = res;
                      this.setPluginI18n();
                    });
                  }
                });
              }
            }
          ); // 调用reaction函数时，它会返回一个用于取消监听的函数。这个函数被称为disposer，它会从MobX内部的监听列表中删除对应的监听器，从而停止对数据的观察。
        }
      }
    );
    reaction(
      // 观察的值
      () => this.checkPlugin,
      // 响应的函数
      async (checkPlugin) => {
        if (checkPlugin) {
          this.checkPluginConfiguration(checkPlugin);
        } else {
          this.showPluginConfiguration = false;
        }
      }
    );
  }
  reactionDisposer?: IReactionDisposer;
  disposeReaction() {
    // 取消监听
    if (this.reactionDisposer) {
      this.reactionDisposer();
      this.reactionDisposer = undefined;
    }
  }










  // ---------------------------------------------------------传统合成
  provider = ""
  setProvider = (value: string) => {
    if (this.provider === value) {
      return;
    }

    this.provider = value;
  }
  runtimeTTSConfigurations: Record<string, Record<string, any>> = {};
  setRuntimeTTSConfiguration = (provider: string, config: Record<string, any>) => {
    if (!provider) {
      return;
    }

    const nextConfig = cloneDeep(config || {});
    if (isEqual(this.runtimeTTSConfigurations[provider], nextConfig)) {
      return;
    }

    this.runtimeTTSConfigurations[provider] = nextConfig;
  };
  getRuntimeTTSConfiguration = (provider: string) => {
    return this.runtimeTTSConfigurations[provider];
  };
  ttsProviders: TTSProviderMeta[] = [];
  setTTSProviders = (value: TTSProviderMeta[]) => {
    this.ttsProviders = value;
    if (!this.provider || !this.ttsProviders.find((item) => item.provider === this.provider)) {
      const firstAvailableProvider = this.ttsProviders.find((item) => !item.disabled);
      this.provider = firstAvailableProvider?.provider || "";
    }
  }
  // ---------------------------------------------------------















  setShowCheckInline = (value: boolean) => {
    this.showCheckInline = value;
  };

  setPluginI18n = () => {
    if (this.memoPlugins) {
      this.setTTSProviders(getTTSProviderMetaList(this.memoPlugins));
      if (this.memoPlugins.installedPluginsI18ns && Object.keys(this.memoPlugins.installedPluginsI18ns).length) {
        Object.keys(this.memoPlugins.installedPluginsI18ns).forEach((pluginId) => {
          settingStore.registerPluginTranslations(pluginId, this.memoPlugins?.installedPluginsI18ns[pluginId]);
        });
      }
    }
  };

  /**
   * 检查插件是否需要进行配置，如果插件配置不符合要求, 需要进行配置时，返回 `true`, 不需要配置时，返回 `false`
   *
   * @param {Plugin} plugin
   * @memberof PluginStore
   */
  checkPluginConfiguration = (plugin: Plugin) => {
    this.showPluginConfiguration = false;
    const manifests = this.memoPlugins?.installedPluginsManifests[plugin.pluginId];
    const configuration = this.memoPlugins?.pluginsConfigurations;
    if (manifests && manifests.configuration && manifests.configurationRequired?.length) {
      const key = `${plugin.pluginId}@${plugin.version}`;
      // 如果插件不存在配置，则显示配置弹窗
      if (!configuration || !configuration[key]) {
        this.showPluginConfiguration = true;

        return true;
      }

      // 如果插件存在配置，但不是所有必填项都填了，则显示配置弹窗
      if (configuration[key]) {
        for (let index = 0; index < manifests.configurationRequired.length; index++) {
          const element = manifests.configurationRequired[index];

          if (!configuration[key][element] && !manifests.defaultsConfiguration?.[element]) {
            this.showPluginConfiguration = true;
            break;
          }
        }

        return this.showPluginConfiguration;
      }
    }
  };

  findPluginByProviderValue = (value: string) => {
    const provider = this.memoPlugins?.pluginProviders.find((item: PluginProvider) => item.value === value);
    if (provider) {
      return this.memoPlugins?.installedPlugins[provider.pluginId!];
    }
  };

  findTTSProviderByValue = (value: string) => {
    return findTTSProviderMeta(this.ttsProviders, value);
  };

  findManifestByProviderValue = (value: string) => {
    const provider = this.findTTSProviderByValue(value);
    if (!provider) {
      return undefined;
    }

    return this.memoPlugins?.installedPluginsManifests?.[provider.pluginId];
  };

  openPluginConfiguration = (plugins: Plugin) => {
    this.checkPlugin = plugins;
    this.showPluginConfiguration = true;
  };
  closePluginConfiguration = (show: boolean) => {
    if (!show) {
      this.checkPlugin = undefined;
      this.showPluginConfiguration = false;
    }
  };
  handleMessage = async (e: any) => {
    if (e && e.ipcData) {
      const msg = e.ipcData as MemoPluginsRefresh;
      if (msg.type === "memo:plugins:refresh") {
        this.memoPlugins = msg.data;
        this.setPluginI18n();
      }
    }
  };

  checkPluginsVersion = (memoPlugins: PluginReturnType) => {
    let count = 0;
    const { installedPlugins = {}, onlinePlugins: { versions = {} } = {} } = memoPlugins;

    Object.keys(installedPlugins).forEach((pluginId) => {
      if ((compareVersions(installedPlugins[pluginId].version, versions[pluginId]) < 0)) {
        count++;
      }
    });

    return count;
  };

  /**
   * 将一个插件设置为待检查插件
   *
   * @param {(Plugin | undefined)} plugins
   * @memberof PluginStore
   */
  setCheckPlugins = (plugins: Plugin | undefined) => {
    this.checkPlugin = plugins;
  };

  saveConfiguration = async (pluginId: string, formData: Record<string, any>) => {
    const data = await window.AIM.plugin.saveConfiguration(pluginId, cloneDeep(formData));
    runInAction(() => {
      this.memoPlugins = data;
    });

    return data;
  };

  handlePluginMessage = () => {
    eventBus.on(customEvents.RendererMessage, this.handleMessage);
  };

  removePluginHandler = () => {
    eventBus.off(customEvents.RendererMessage, this.handleMessage);
  };
}

export default PluginStore;
