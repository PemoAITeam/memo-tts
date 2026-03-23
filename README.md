# Memo TTS Editor

Memo TTS 编辑器是 [PemoAITeam](https://github.com/PemoAITeam) 桌面应用的文字转语音（TTS）脚本编辑前端。

## 功能特性

- **TTS 脚本编辑** - 基于 TipTap 的富文本编辑器，支持 TTS 脚本块编辑
- **语音设置** - 支持按块配置语音，按片段设置语速/情感标记
- **翻译集成** - 脚本翻译后进行语音合成（支持 Microsoft、Google、OpenAI、智谱 AI、火山翻译、DeepL、百度翻译）
- **TTS 合成** - 支持多种 TTS 提供商（Edge TTS、OpenAI、火山引擎等）
- **媒体库** - 管理和复用导入的媒体资源（支持 BGM）
- **历史记录** - 查看、重新编辑和导出历史 TTS 记录
- **导出选项** - 音频导出支持字幕数据，通过桌面端进行视频渲染
- **插件系统** - 支持插件扩展 TTS 提供商配置

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 富文本编辑器 | TipTap |
| 样式 | Tailwind CSS + SCSS + Radix UI |

### 支持语言

English、简体中文、繁体中文、日语、韩语、西班牙语、德语、意大利语

## 项目结构

```
src/
├── app/
│   ├── main.tsx           # 应用入口
│   ├── App.tsx            # 根组件
│   ├── components/
│   │   ├── business/      # 业务组件（编辑器、面板等）
│   │   ├── extensions/    # TipTap 扩展
│   │   └── ui/            # 通用 UI 组件
│   ├── lib/               # 工具库
│   │   ├── tts-plugin.ts  # TTS 插件集成
│   │   ├── tts-segments.ts # 文本片段提取
│   │   └── tts-mention/   # 内联 TTS 标记
│   ├── locales/           # i18n 翻译文件
│   ├── pages/             # 页面组件
│   │   ├── home/          # 主编辑/合成页面
│   │   └── history/       # 历史记录页面
│   ├── routes/            # 路由配置
│   └── stores/            # MobX 状态管理
│       ├── appStore.ts    # 应用级状态
│       ├── dataStore.ts   # TTS 数据管理
│       ├── settingStore.ts # 设置和 i18n
│       └── pluginStore.ts # 插件管理
└── events/
    └── eventBus.ts        # 事件总线
```

## 开发

### 环境要求

- Node.js 18+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

开发服务器将在 `http://localhost:5175/` 启动。

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

### 代码检查

```bash
pnpm lint
```

## 运行模式

### 桌面端托管模式

作为 Electron 应用的前端运行，通过 `window.AIM` 与宿主应用通信：

```typescript
// 宿主 API 示例
window.AIM.getSetting()           // 获取设置
window.AIM.tts.mergeTemo()        // 合并 TTS 数据
window.AIM.tts.getTemoData()      // 获取历史数据
window.AIM.plugin.readLocalPlugins() // 读取插件
```

### iframe 回退模式

当 `window.AIM` 不可用时，使用 `@memo/iframe-ipc` 作为通信桥接。

## 核心 TTS 提供商

| 提供商 | 类型 | 说明 |
|--------|------|------|
| Edge TTS | 内置 | 微软 Edge 免费语音合成 |
| OpenAI | 内置 | OpenAI TTS API |
| Volcano | 内置 | 火山引擎 TTS |
| Plugin-backed | 插件 | 通过插件系统扩展 |

## 相关文档

- [AGENTS.md](./AGENTS.md) - 完整的项目架构和开发指南
- [docs/](./docs/) - 设计文档

## License

MIT
