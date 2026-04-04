# MemoAI TTS 系统架构文档

## 概述

MemoAI TTS 是一个基于 Electron 桌面应用的语音合成(TTS)创作系统，采用**宿主-插件架构**。系统由四个独立项目协作组成：

| 项目 | 路径 | 角色 |
|------|------|------|
| **electron-react** | `F:/Develop/electron-react` | Electron 宿主应用，提供主进程服务、IPC 桥接和插件运行时 |
| **memo-tts** | `F:/Develop/memo-tts` | TTS 创作前端（Temo），作为 iframe 插件嵌入宿主，提供富文本编辑器和合成界面 |
| **MemoAITranslate** | `F:/Develop/MemoAITranslate` | 插件集合，包含 TTS/ASR/翻译等所有插件实现 |
| **memo-plugin-manager** | `F:/Develop/memo-plugin-manager` | 插件管理器库，负责插件的安装、加载、沙箱执行和生命周期管理 |

---

## 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                   Electron 宿主 (electron-react)             │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │   主进程 (Main)   │    │        渲染进程 (Renderer)     │  │
│  │                  │    │                              │  │
│  │ PluginManager ───┼───>│  window.AIM (IPC 桥接)       │  │
│  │ (加载/执行插件)   │    │         │                    │  │
│  │                  │    │         ▼                    │  │
│  │ TTS Handler      │    │  ┌─────────────────────┐    │  │
│  │ (调用插件合成)    │    │  │   PluginPagesContainer   │    │  │
│  │                  │    │  │   ┌───────────────┐   │    │  │
│  │ Plugin Handler   │    │  │   │  <iframe>      │   │    │  │
│  │ (安装/配置插件)   │    │  │   │               │   │    │  │
│  │                  │    │  │   │  memo-tts      │   │    │  │
│  │ preload bridge   │    │  │   │  (Temo 编辑器) │   │    │  │
│  │ (IPC 暴露为AIM)  │    │  │   │               │   │    │  │
│  └──────────────────┘    │  │   └───────────────┘   │    │  │
│                          │  └─────────────────────┘    │  │
│                          └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │    MemoAITranslate (插件集合)             │
         │                                         │
         │  plugins/tts/edge/      (Edge TTS)      │
         │  plugins/tts/openai/    (OpenAI TTS)    │
         │  plugins/tts/azure/     (Azure TTS)     │
         │  plugins/tts/elevenlabs/ (ElevenLabs)   │
         │  plugins/tts/volctrans/ (火山引擎 TTS)   │
         │  plugins/asr/*          (ASR 插件)      │
         │  plugins/translate/*    (翻译插件)       │
         │                                         │
         │  core/     → @memo-plugins/core (接口)   │
         │  manager/  → @memo-plugins/manager       │
         └──────────────┬──────────────────────────┘
                        │ 打包为 .memox
                        ▼
         ┌─────────────────────────────────────────┐
         │    memo-plugin-manager                   │
         │    (@aim-packages/plugin-manager)        │
         │                                         │
         │  安装 / 卸载 / 加载 / 沙箱执行 / 配置管理  │
         └─────────────────────────────────────────┘
```

---

## 一、electron-react — 宿主应用

### 1.1 技术栈

- Electron 27 + Vite 4 + React 18
- TypeScript，MobX 状态管理
- SQLite3 本地数据库
- FFmpeg 音视频处理

### 1.2 核心职责

宿主应用是整个系统的运行容器，负责：

1. **插件生命周期管理** — 通过 `@aim-packages/plugin-manager` 实例化 `PluginManager`，管理插件的安装、更新、卸载
2. **TTS 合成调度** — 主进程中的 TTS Handler 接收前端请求，加载插件实例并调用 `textToSpeech()` 方法
3. **IPC 桥接** — 通过 Electron preload 脚本将主进程能力暴露给渲染进程，封装为 `window.AIM` 全局对象
4. **iframe 托管** — 在渲染进程中通过 `<iframe>` 嵌入 memo-tts（Temo）前端

### 1.3 插件管理器初始化

```typescript
// electron/main/app.ts
const m = new PluginManager({
  location: pluginsFolder,        // 用户插件安装目录 (%APPDATA%/.memo-ai/plugins/)
  presetLocation,                 // 预装插件目录 (resources/plugins/)
  requestUrl: PLUGINS_DOMAIN,     // 在线插件注册表 (https://integrations.memo.ac/plugins/v2)
  removeDefaultPlugins: process.env.NODE_ENV !== "development",
  onReady: () => { resolve(m); }
});
```

### 1.4 TTS 插件加载与调用

```
用户点击合成 → memo-tts 发起 IPC 请求 → 主进程 TTS Handler
    → PluginManager.loadPlugin(pluginId)      // 加载插件 JS
    → new PluginClass(mergedConfig)            // 实例化
    → pluginInstance.textToSpeech({text, ...}) // 逐段调用
    → 写入音频文件 → 推送进度事件 → 完成通知
```

配置合并顺序：`manifest.defaultsConfiguration` → `用户存储的配置` → `运行时参数`

### 1.5 IPC 通信架构

宿主与 memo-tts 之间有**三个通信通道**：

#### 通道 A：请求/响应（ipcMain/ipcRenderer）

前端通过 `window.AIM.*` 直接调用主进程方法：

```typescript
window.AIM.plugin.readLocalPlugins()   // 读取插件列表
window.AIM.tts.mergeTemo(payload)      // 发起合成
window.AIM.plugin.saveConfiguration()  // 保存插件配置
```

#### 通道 B：主进程推送（renderer-message）

主进程向渲染进程推送事件：

```typescript
// 主进程
win.webContents.send("renderer-message", { type: "temo:audio:progress", data: {...} })

// 渲染进程
window.AIM.handleMessage(handler, "TemoApp")  // 注册处理器
```

事件类型：`temo:audio:start`、`temo:audio:progress`、`temo:audio:end`、`temo:audio:error`、`temo:audio:abort`、`tts:media:progress`、`tts:media:done`、`memo:plugins:refresh`

#### 通道 C：iframe IPC（postMessage）

memo-tts 运行在 iframe 中，通过 `@aim-packages/iframe-ipc` 的 Bridge 通信：

```
iframe (memo-tts)
  → window.postMessage({ action: "IPC_REQUEST", method: "tts.mergeTemo", params })
  → 宿主 useBridge 拦截
  → 解析 window.AIM.tts.mergeTemo 并调用
  → postMessage({ action: "IPC_RESPONSE", result }) 回传结果
```

### 1.6 Temo URL 映射

```typescript
// electron/main/handlers/window.ts
browserUrls["memo-plugin-app-tts"] = process.env.VITE_DEV_SERVER_URL
  ? "http://localhost:5175/"           // 开发模式
  : "./apps/temo/index.html";          // 生产模式
```

---

## 二、memo-tts — TTS 创作前端（Temo）

### 2.1 技术栈

- React 18 + TypeScript + Vite 5
- TipTap 富文本编辑器
- MobX 状态管理 + `mobx-persist-store`
- Tailwind CSS + Radix UI / shadcn 组件
- i18next 国际化（8 种语言）

### 2.2 运行方式

- 开发模式：独立 Vite 开发服务器 `http://localhost:5175/`
- 生产模式：构建为静态文件，嵌入 Electron 的 iframe 中通过 `file://` 协议加载
- 使用 `HashRouter` 和 `base: './'` 以支持文件路径加载

### 2.3 启动流程

```
1. main.tsx
   └─ 检测 window.AIM 是否存在
      ├─ 存在（宿主模式）→ 直接使用
      └─ 不存在（独立模式）→ 创建 Bridge 实例作为降级
   └─ createRoot 挂载 React

2. App.tsx
   └─ 并行初始化:
      ├─ settingStore.initSetting()  → 加载设置 + 初始化 i18n
      └─ dataStore.initData()        → 加载历史/草稿/库
   └─ 设置就绪后注册消息处理器:
      ├─ appStore.handleMessage()    → 转发宿主消息到 eventBus
      ├─ pluginStore.handlePluginMessage() → 监听插件刷新
      └─ dataStore.handleDataMessage()     → 监听合成进度

3. routes.tsx
   └─ 渲染永久左侧边栏 + 右侧编辑器面板
```

### 2.4 编辑器架构

文档模型使用 TipTap（基于 ProseMirror），结构极简：

```
doc
├── editorCard (id, voice?)
│   ├── 文本节点
│   ├── ttsMention (内联声音标记)
│   └── ttsMark (选段级别的速度/情感标记)
├── editorCard ...
└── ...
```

- `editorCard` 是唯一的块级节点类型
- `ttsMention` 是内联原子节点，通过 `@` 触发插入
- `ttsMark` 是文本标记，通过选中文本后弹出气泡菜单应用

### 2.5 四层配置合并机制

合成时，配置按以下顺序叠加（后者覆盖前者）：

```
第 1 层：全局选择配置（来自当前选中的 TTS 提供者）
第 2 层：卡片级别配置（editorCard.attrs.voice）
第 3 层：行内声音配置（ttsMention 节点属性）
第 4 层：选段级别配置（ttsMark 的 speed/emotion/config）
```

### 2.6 合成流程

```
用户选择提供者 → 编写脚本 → 插入 @声音 → 设置选段参数 → 点击合成
    │
    ▼
buildHomeSelection() 合并配置
    │
    ▼
dataStore.mergeTemo()
    ├─ normalizeEditorDocument()  规范化文档
    ├─ extractTextSegmentsFromNodeWithMentions()  提取文本片段
    ├─ splitString()  长文本按句子拆分 (>1000字符)
    ├─ mergePluginConfigLayers()  合并四层配置
    └─ window.AIM.tts.mergeTemo(payload, uuid, extra)  发送到宿主
         │
         ▼
       宿主主进程执行 TTS → 推送进度 → 完成
         │
         ▼
       eventBus 接收结果 → 更新历史列表 → 导航到新记录
```

### 2.7 状态管理（四个 MobX Store）

| Store | 文件 | 职责 |
|-------|------|------|
| `settingStore` | `stores/settingStore.ts` | 加载应用设置，初始化 i18n，注册插件翻译 |
| `pluginStore` | `stores/pluginStore.ts` | 加载插件元数据，构建 TTS 提供者列表，管理运行时配置 |
| `dataStore` | `stores/dataStore.ts` | 管理历史记录、草稿、库数据、合成进度、导出/删除 |
| `appStore` | `stores/appStore.ts` | 桥接宿主 IPC 消息到本地 eventBus，持久化当前路由 ID |

### 2.8 宿主 API 使用清单

memo-tts 通过 `window.AIM` 调用的全部宿主 API：

**顶层方法：**
- `getSetting` — 获取应用设置
- `openDialog` — 打开原生对话框
- `handleMessage` / `removeHandler` — 注册/移除消息处理器
- `isWindows` / `isMac` — 平台检测

**插件方法 (`window.AIM.plugin`)：**
- `readLocalPlugins` — 读取已安装插件列表
- `saveConfiguration` — 保存插件配置

**TTS 方法 (`window.AIM.tts`)：**
- `getTemoData` — 获取历史记录
- `updateTemoData` — 更新记录
- `deleteTemoData` — 删除记录
- `mergeTemo` — 发起合成
- `abortMergeTemo` — 中止合成
- `synthesize` — 语音预览
- `getPluginEditorOptions` — 获取动态编辑器选项
- `renderMedia` — 渲染视频
- `temoDownload` — 导出音频

---

## 三、MemoAITranslate — 插件集合

### 3.1 项目结构

pnpm workspace monorepo：

```
MemoAITranslate/
├── core/                    # @memo-plugins/core — 插件接口定义
├── manager/                 # @memo-plugins/manager — 运行时管理器
├── plugins/
│   ├── tts/                 # TTS 插件
│   │   ├── edge/            # Edge TTS (WebSocket)
│   │   ├── openai/          # OpenAI TTS
│   │   ├── azure/           # Azure TTS
│   │   ├── elevenlabs/      # ElevenLabs TTS
│   │   └── volctrans/       # 火山引擎 TTS
│   ├── asr/                 # ASR 转写插件 (openai, groq, deepgram 等)
│   ├── translate/           # 翻译插件 (25+ 提供者)
│   └── app/                 # 应用型插件 (english, japanese, article)
├── scripts/                 # 构建/发布脚本
└── output/                  # 构建产物 (.memox 包)
```

### 3.2 插件接口（@memo-plugins/core）

定义了三种基础接口：

```typescript
// TTS 插件必须实现的接口
interface BaseTTS {
  textToSpeech(options: TTSOptions): Promise<Buffer | string>;
}

// ASR 插件必须实现的接口
interface BaseASR {
  speechToText(options: ASROptions): Promise<WhisperSegments[]>;
}

// 翻译插件必须实现的接口
interface BaseTranslate {
  translate(options: TranslateOptions): Promise<TranslateResult>;
  abort(): void;
}
```

### 3.3 插件结构规范

每个插件遵循统一结构：

```
plugins/tts/edge/
├── lib/
│   ├── index.ts           # 入口，导出实现 BaseTTS 的默认类
│   ├── manifest.json      # 插件元数据、配置表单、提供者信息
│   ├── i18n.json          # 多语言 UI 字符串
│   ├── options.json       # 静态选项数据（声音列表、语言列表）
│   └── icon.svg           # 插件图标
├── components/            # 可选：设置 UI 的 React 组件
│   ├── src/
│   └── dist/components.js
├── dist/                  # 构建输出
├── package.json
└── tsup.config.ts
```

### 3.4 插件清单（manifest.json）关键字段

```jsonc
{
  "pluginId": "memo-plugin-tts-edge",      // 唯一标识
  "type": "tts",                            // 插件类型: tts/translate/transcription/app
  "importType": "module",                   // 加载方式: module(直接require) / sandbox(vm2沙箱)
  "provider": { "value": "Edge", "label": "Edge" },  // 服务提供者
  "configuration": [                        // 配置表单字段定义
    {
      "label": "Voice",
      "key": "voice",
      "type": "select",                     // text/password/number/checkbox/select/slider
      "options": [{ "value": "...", "label": "..." }],
      "inherit": "edgeTTS.Voice"            // 可选：从全局设置继承
    }
  ],
  "memoTtsEditor": { ... },                 // Temo 编辑器字段元数据
  "defaultsConfiguration": { ... },          // 默认配置值
  "configurationRequired": ["voice"],        // 必填字段
  "configurationExposed": ["voice", "rate"], // 运行时暴露字段
  "configurationStorage": ["voice"]          // 本地持久化字段
}
```

### 3.5 构建与发布流程

```
1. pnpm build:core         → 编译 core (tsc)
2. pnpm build              → 逐个编译插件 (tsup → CJS 单文件)
3. pnpm postbuild          → 打包为 .memox (ZIP 归档)
   └─ dist/ → 压缩为 output/{pluginId}@{version}.memox
4. pnpm run publish (scripts/publish.js)
   └─ 上传到 Cloudflare R2 (https://plugins.memo.ac/)
   └─ 更新在线注册表 (https://integrations.memo.ac/plugins)
```

### 3.6 TTS 插件实现细节

所有 TTS 插件遵循相同的模式：

```typescript
// plugins/tts/edge/lib/index.ts
import { BaseTTS } from "@memo-plugins/core";

export default class EdgeTTS implements BaseTTS {
  constructor(private config: any) {}

  async textToSpeech(options: { text: string; voiceName?: string; rate?: string }) {
    if (!options.text) return silentMp3Buffer;  // 空文本返回静音
    // ... 调用服务 API 获取音频
    return audioBuffer;  // 返回 Buffer 或 base64 字符串
  }
}

// 可选：提供动态编辑器选项
export function getEditorOptions() {
  return voiceOptions;  // 用于编辑器的声音列表
}
```

---

## 四、memo-plugin-manager — 插件管理器

### 4.1 核心类：PluginManager

作为 `@aim-packages/plugin-manager` 发布，被宿主应用引用。

### 4.2 生命周期管理

| 阶段 | 方法 | 说明 |
|------|------|------|
| **发现** | `getOnlinePlugins()` | 从远程注册表获取在线插件列表 |
| **安装** | `installPlugins()` | 从本地 `.memox` 文件安装 |
| | `installOnlinePlugins()` | 从在线注册表下载并安装 |
| **预装** | `_installDefaultPlugins()` | 解压应用自带的 `.memox` 预装插件 |
| **配置** | `saveConfiguration()` | 保存插件配置到 `configuration.json` |
| **加载** | `loadPlugin()` | 加载插件 JS 并返回模块实例 |
| **卸载** | `uninstallPlugin()` | 移除插件文件和所有关联数据 |

### 4.3 插件包格式（.memox）

`.memox` 本质是 ZIP 归档，包含：

```
plugin.memox (ZIP)
├── manifest.json       # 必须：插件清单
├── index.js            # 必须：插件入口 (CJS)
├── i18n.json           # 可选：多语言字符串
├── icon.svg            # 可选：插件图标
├── components.js       # 可选：设置 UI 组件
└── page/               # 可选：应用型插件的完整页面
    ├── index.html
    └── assets/
```

### 4.4 沙箱执行（vm2）

非 `module` 类型的插件在 vm2 沙箱中执行：

```typescript
const vm = new NodeVM({
  require: {
    external: false,
    builtin: ["url", "http", "https", "stream", "crypto", "buffer", "util", "path", "zlib", "punycode"]
    // 注意：fs 不在允许列表中
  },
  sandbox: {}
});
vm.freeze(AbortController, "AbortController");
vm.freeze(TextDecoder, "TextDecoder");
vm.setGlobal("process", process);
```

### 4.5 暴露给宿主的 API

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getOnlinePlugins()` | `MemoPlugins` | 获取在线插件列表 |
| `installPlugins(packs)` | `PluginReturnType` | 安装本地插件包 |
| `uninstallPlugin(id)` | `PluginReturnType` | 卸载插件 |
| `installOnlinePlugins(id)` | `PluginReturnType` | 安装在线插件 |
| `loadPlugin(id)` | `any` | 加载并返回插件模块 |
| `saveConfiguration(id, data)` | `PluginReturnType` | 保存配置 |
| `getPluginProviders()` | `PluginProvider[]` | 获取所有服务提供者 |
| `getInstalledPlugins()` | `Record<string, Plugin>` | 获取已安装插件 |
| `getAllData()` | `PluginReturnType` | 获取完整状态快照 |

`PluginReturnType` 是核心数据传输对象，包含：`localPlugins`、`onlinePlugins`、`installedPlugins`、`installedPluginsManifests`、`installedPluginsI18ns`、`pluginProviders`、`pluginsConfigurations`。

---

## 五、端到端数据流

### 5.1 完整合成流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 用户操作 (memo-tts iframe)                                    │
│    选择 TTS 提供者 → 编写脚本 → @插入声音 → 设置选段参数 → 合成    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. 前端处理 (memo-tts)                                           │
│    buildHomeSelection()     合并全局/存储/运行时配置               │
│    normalizeDocument()      规范化 TipTap 文档                    │
│    extractSegments()        提取文本片段（含声音/标记信息）         │
│    mergeConfigLayers()      四层配置合并                          │
│    splitLongText()          超长文本按句拆分                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │ postMessage (IPC_REQUEST)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. iframe IPC 桥接 (electron-react 渲染进程)                     │
│    useBridge 拦截 → 解析方法路径 → 调用 window.AIM.tts.mergeTemo  │
│    → ipcRenderer.invoke("merge-temo")                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Electron IPC
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 主进程处理 (electron-react 主进程)                             │
│    TTS Handler 接收请求                                          │
│    → PluginManager.loadPlugin(pluginId)   加载插件代码            │
│    → new PluginClass(mergedConfig)        实例化                  │
│    → 逐段调用 pluginInstance.textToSpeech({text, ...})           │
│    → 写入音频文件 (MP3)                                          │
│    → FFmpeg 合并所有片段                                          │
│    → 推送进度事件 (renderer-message)                              │
│    → 完成后发送 temo:audio:end                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ 渲染进程 → iframe
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. 结果展示 (memo-tts iframe)                                    │
│    eventBus 接收进度/完成事件                                     │
│    → 更新 UI 进度条                                               │
│    → 插入历史记录到列表顶部                                        │
│    → 导航到新记录页面                                              │
│    → 清除草稿编辑器                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 插件安装流程

```
用户点击安装 / 应用启动预装
    │
    ▼
PluginManager.installPlugins() / installOnlinePlugins()
    │
    ├─ 在线模式: 下载 .memox → 校验哈希
    └─ 本地模式: 读取 .memox 文件
    │
    ▼
解压到临时目录 → 读取 manifest.json
    │
    ▼
复制到 {location}/{pluginId}@{version}/
    │
    ▼
合并配置（继承旧版本配置 + 全局设置 inherit）
    │
    ▼
持久化 index.json + configuration.json
    │
    ▼
通知渲染进程 memo:plugins:refresh
    │
    ▼
memo-tts pluginStore 重建提供者列表
```

---

## 六、项目间依赖关系

```
                    ┌──────────────────┐
                    │  electron-react   │ (宿主)
                    │                  │
                    │  dependencies:   │
                    │  - @aim-packages/ │
                    │    plugin-manager │
                    └────────┬─────────┘
                             │ npm 依赖
                             ▼
                 ┌──────────────────────┐
                 │  memo-plugin-manager │ (插件管理器)
                 │  @aim-packages/      │
                 │  plugin-manager      │
                 └──────────────────────┘

                    ┌──────────────────┐
                    │   memo-tts        │ (TTS 前端)
                    │                  │
                    │  dependencies:   │
                    │  - @aim-packages/ │
                    │    iframe-ipc     │ ← iframe 通信桥接
                    │  - @aim-packages/ │
                    │    plugin-manager │ ← 类型定义
                    └──────────────────┘

                    ┌──────────────────┐
                    │ MemoAITranslate   │ (插件集合)
                    │                  │
                    │  dependencies:   │
                    │  - @memo-plugins/ │
                    │    core           │ ← 插件接口
                    │  - @aim-packages/ │
                    │    iframe-ipc     │ ← 应用型插件通信
                    │  - @aim-packages/ │
                    │    subtitle       │ ← 字幕解析
                    └──────────────────┘
```

**共享包说明：**

| 包名 | 提供者 | 使用者 | 作用 |
|------|--------|--------|------|
| `@aim-packages/plugin-manager` | memo-plugin-manager | electron-react, memo-tts | electron-react 使用其功能；memo-tts 仅使用其类型定义 |
| `@aim-packages/iframe-ipc` | (npm 包) | memo-tts, MemoAITranslate | iframe 与宿主之间的 IPC 通信桥接 |
| `@memo-plugins/core` | MemoAITranslate/core | MemoAITranslate/plugins/* | 定义 TTS/ASR/翻译插件必须实现的接口 |

---

## 七、开发模式

### 7.1 本地开发

```bash
# 1. 启动 memo-tts 开发服务器
cd F:/Develop/memo-tts
pnpm dev    # http://localhost:5175/

# 2. 启动 electron-react 开发服务器
cd F:/Develop/electron-react
pnpm dev    # 自动检测 localhost:5175 作为 memo-plugin-app-tts 的 URL
```

宿主在开发模式下会将 Temo iframe 的 URL 指向 `http://localhost:5175/`，实现热更新。

### 7.2 插件开发

```bash
# 构建插件
cd F:/Develop/MemoAITranslate
pnpm build              # 构建所有插件
pnpm build:core         # 仅构建 core

# 产物位于 output/*.memox
```

### 7.3 生产构建

```bash
# memo-tts 构建为静态文件
cd F:/Develop/memo-tts && pnpm build

# 产物复制到 electron-react 的 apps/temo/ 目录
# electron-react 构建打包 Electron 应用
cd F:/Develop/electron-react && pnpm build
```

---

## 八、关键设计决策

1. **插件优先架构** — 所有 TTS 提供者来自插件系统，宿主不硬编码任何 TTS 实现（仅保留旧版兼容解析）

2. **宿主委托** — memo-tts 前端不执行任何 TTS 合成，仅构建 payload 并委托给宿主主进程

3. **iframe 隔离** — Temo 编辑器运行在独立 iframe 中，通过 IPC 桥接与宿主通信，实现 UI 隔离和独立部署

4. **沙箱执行** — 非信任插件代码在 vm2 沙箱中执行，仅暴露有限的 Node.js 内置模块（不含 fs）

5. **四层配置合并** — 全局 → 卡片 → 行内声音 → 选段标记，灵活的配置继承体系

6. **文档规范化** — 编辑器强制规范化为纯 `editorCard` 结构，确保文档模型一致性

7. **离线优先** — 插件列表、配置、历史数据均本地持久化，支持离线使用
