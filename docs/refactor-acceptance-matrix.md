# 文档验收对照表

本文用于核对 `docs/tts-plugin-refactor.md` 与 `docs/electron-host-adapter.md`
中的目标项在当前代码状态下是否已经落地。

状态说明：

- `已完成`：代码主路径已落地，当前仓库内可看到明确实现
- `部分完成`：主干已经改到位，但仍有明显缺口、仅部分场景支持，或尚未完成端到端验收
- `未完成`：目标尚未落地，或当前代码仍缺关键实现
- `文档需更新`：目标本身已变化、边界描述过期，或当前实现与文档写法不再一致

本次结论基于静态代码审计：

- `memo-tts` 前端按插件化改造的 Phase 1 / Phase 2 基本完成
- Phase 3 只完成了一部分，最大缺口在“分段级任意插件字段编辑”
- `electron-host-adapter.md` 中“真实宿主仓库尚不可用”的前提已经过期，实际宿主改造已在 `F:\Develop\electron-react` 落地了一部分
- 当前没有完成 `pnpm build` / 真机联调验收，因此所有“运行通过”类目标只能标到静态层面的完成度

## 一、`docs/tts-plugin-refactor.md`

| 目标条目 | 状态 | 当前实现结论 | 主要依据 |
| --- | --- | --- | --- |
| TTS provider 只从 Electron 插件加载 | 已完成 | `pluginStore` 已从插件清单导出 `ttsProviders`，选择器只渲染插件 Provider | `src/app/stores/pluginStore.ts`、`src/app/components/business/SelectTTSProvider.tsx` |
| 前端不再走内建 Edge / OpenAI / Volcano 主流程 | 部分完成 | 活跃合成链路已经不再按内建 Provider 分支，但仍保留旧数据兼容和 legacy rebinding 逻辑 | `src/app/stores/dataStore.ts`、`src/app/lib/tts-plugin.ts`、`src/app/components/business/tiptap.tsx` |
| voice / speed / emotion / 其他可编辑字段由插件元数据驱动，而不是前端硬编码 | 部分完成 | 全局/卡片级基本已插件化；分段级仍主要围绕 `voice`、`speed`、`emotion`，没有真正泛化到任意 `memoTtsEditor.fields` | `src/app/lib/tts-plugin.ts`、`src/app/lib/tts-mention/data.ts`、`src/app/lib/tts-mention/use-tts-bubble-menu.ts`、`src/app/components/business/tts-bubble-menu.tsx` |
| 前端提交通用 plugin payload | 已完成 | `dataStore.mergeTemo()` 已输出 `{ mode: "plugin", provider, pluginId, data[] }` 结构 | `src/app/stores/dataStore.ts` |
| Provider metadata 包含 provider / pluginId / label / disabled / version / exposed fields / required fields / editor metadata | 已完成 | `getTTSProviderMetaList()` 已整理这些字段 | `src/app/lib/tts-plugin.ts` |
| 支持 global / card / segment 三层配置 | 已完成 | 已有全局配置、卡片覆盖、分段 mention/mark 配置，并在合成时分层合并 | `src/app/components/business/tts-panel.tsx`、`src/app/components/business/editor-item.tsx`、`src/app/stores/dataStore.ts` |
| 配置合并优先级 `segment > card > global` | 已完成 | `mergeTemo()` 中按 `global -> card -> mention config -> segment runtime` 顺序合并，最终后者覆盖前者 | `src/app/stores/dataStore.ts`、`src/app/lib/tts-plugin.ts` |
| `TemoData.ttsOptions` 改为插件通用结构 | 已完成 | 新结构已使用 `TTSSelection`；同时保留旧结构读取兼容 | `src/app/interface.d.ts`、`src/app/lib/tts-plugin.ts` |
| `editorCard.attrs.voice` 改为插件通用结构 | 已完成 | `editor-item.tsx` 已直接保存 `TTSSelection` | `src/app/components/business/editor-item.tsx` |
| `ttsMention.attrs.config` 改为插件通用结构 | 已完成 | `@voice` 插入的数据已包含 `provider / pluginId / displayLabel / config` | `src/app/lib/tts-mention/data.ts`、`src/app/lib/tts-mention/use-tts-mention-menu.ts` |
| 支持 `memoTtsEditor` 扩展元数据 | 部分完成 | 已能读取 `displayField`、`fields`、`role`、`scope` 并用于主面板/菜单；但没有完整覆盖任意字段类型和任意分段级字段渲染 | `src/app/lib/tts-plugin.ts`、`src/app/lib/tts-mention/data.ts` |
| `src/app/lib/tts-plugin.ts` 提供插件化 TTS 类型和辅助函数 | 已完成 | 已新增并成为共享类型层 | `src/app/lib/tts-plugin.ts` |
| `src/app/interface.d.ts` 增加插件 TTS 桥接类型 | 部分完成 | 已补 `tts.mergeTemo`、`tts.synthesize`、`tts.getPluginEditorOptions` 等，但 `plugin.getProviders` 仍是可选，且部分返回值仍为 `Promise<any>` | `src/app/interface.d.ts` |
| `pluginStore` 去掉内建默认 Provider，并从插件清单派生 Provider 列表 | 已完成 | 已从 `memoPlugins` 派生 `ttsProviders`，并自动选择首个可用 Provider | `src/app/stores/pluginStore.ts` |
| `SelectTTSProvider` 去掉内建 Provider 选项，只显示插件 | 已完成 | 下拉列表完全来自 `ttsProviders` | `src/app/components/business/SelectTTSProvider.tsx` |
| `tts-panel` 移除内建配置面板，只渲染插件暴露表单 | 已完成 | `EdgeConfig` / `OpenAIConfig` / `VolcanoConfig` 已离开活跃路径，面板统一使用 `memo-form-renderer` | `src/app/components/business/tts-panel.tsx` |
| `tts-panel` 统一走 `window.AIM.tts.synthesize(...)` 试听 | 已完成 | 试听逻辑已改为统一 `synthesize` | `src/app/components/business/tts-panel.tsx` |
| `editor-item` 不再写入 provider-specific 卡片对象 | 已完成 | 卡片内保存的是通用 `VoiceOptions/TTSSelection` | `src/app/components/business/editor-item.tsx` |
| `tiptap` 的 Provider 类型放宽为 `string`，并持久化通用选择对象 | 已完成 | 当前编辑器上下文、历史恢复、legacy rebinding 都基于通用 `TTSSelection` | `src/app/components/business/tiptap.tsx` |
| `dataStore.mergeTemo()` 去掉 provider-specific payload 构造 | 已完成 | 不再按 `Edge/OpenAI/Volcano` 组 payload，统一构造插件 payload | `src/app/stores/dataStore.ts` |
| Phase 1：先让 mention / bubble menu 在泛化类型下继续可用 | 已完成 | 相关 Hook/菜单已能在插件 Provider 下工作 | `src/app/lib/tts-mention/` |
| Phase 2：替换 `tts-mention/data.ts` 静态 Provider 树 | 已完成 | 菜单路径已从插件元数据动态生成 | `src/app/lib/tts-mention/data.ts` |
| Phase 2：把固定 speed/emotion Bubble Menu 改成插件驱动字段编辑 | 已完成 | Bubble Menu 已改成按插件 `segment` 字段数组动态渲染，不再硬编码为两个固定控件 | `src/app/lib/tts-mention/use-tts-bubble-menu.ts`、`src/app/components/business/tts-bubble-menu.tsx` |
| Phase 2：按 `memoTtsEditor.fields` 渲染分段级可编辑字段 | 部分完成 | 已支持任意 option-based `segment` 字段的渲染与写回，但 richer field types、voice 路径统一化和更多宿主动态选项场景仍需继续完善 | `src/app/lib/tts-plugin.ts`、`src/app/lib/tts-mention/use-tts-bubble-menu.ts`、`src/app/components/business/tts-bubble-menu.tsx`、`src/app/lib/tts-segments.ts` |
| 停用内建配置组件 `edge-config.tsx` / `openAI-config.tsx` / `volcano-config.tsx` | 已完成 | 这几个文件已从仓库删除 | Git 状态、`src/app/components/business/` |
| `src/app/lib/tts.ts` 不再作为运行时语音源 | 已完成 | 静态语音目录文件已删除，不再参与运行时路径 | Git 状态、`src/app/lib/` |
| 宿主需要暴露 `window.AIM.plugin.getProviders("tts")` | 文档需更新 | 当前前端主路径实际依赖的是 `readLocalPlugins()` 派生 Provider；`getProviders` 没有成为当前链路的必要条件 | `src/app/stores/pluginStore.ts`、`src/app/main.tsx`、`src/app/interface.d.ts` |
| 宿主需要暴露 `window.AIM.tts.synthesize(...)` | 已完成 | 前端已接入，`electron-react` 宿主也已有实现 | `src/app/components/business/tts-panel.tsx`、`F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 宿主需要把 `window.AIM.tts.mergeTemo(...)` 改成接收插件 payload | 已完成 | 前端已按新结构发送，`electron-react` 已有 plugin branch | `src/app/stores/dataStore.ts`、`F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| Rollout Phase 1 | 已完成 | 基础类型、Provider 选择、主面板插件化均已到位 | `src/app/lib/tts-plugin.ts`、`src/app/components/business/SelectTTSProvider.tsx`、`src/app/components/business/tts-panel.tsx` |
| Rollout Phase 2 | 已完成 | 卡片级配置、合成载荷、历史恢复已切到通用结构 | `src/app/components/business/editor-item.tsx`、`src/app/stores/dataStore.ts`、`src/app/components/business/tiptap.tsx` |
| Rollout Phase 3 | 部分完成 | 编辑器系统已有插件化基础，但分段级 UI 仍未完全泛化 | `src/app/lib/tts-mention/`、`src/app/components/business/tts-bubble-menu.tsx` |
| Rollout Phase 4 | 部分完成 | 内建配置组件和静态语音数据已移除，但仍存在 legacy 兼容代码与固定 speed/emotion 语义 | `src/app/lib/tts-plugin.ts`、`src/app/components/business/tts-bubble-menu.tsx` |
| Validation：App 在存在插件元数据时可正常加载 | 部分完成 | 从代码上看已具备，但未完成真实构建/运行验收 | `src/app/App.tsx`、`src/app/stores/pluginStore.ts` |
| Validation：首个已安装 TTS 插件可自动选中 | 已完成 | `pluginStore` / `SelectTTSProvider` 已实现默认选中逻辑 | `src/app/stores/pluginStore.ts`、`src/app/components/business/SelectTTSProvider.tsx` |
| Validation：Provider 下拉只显示插件 | 已完成 | 当前实现已满足 | `src/app/components/business/SelectTTSProvider.tsx` |
| Validation：全局 TTS 面板渲染插件暴露字段 | 已完成 | `tts-panel` 已使用插件配置生成表单 | `src/app/components/business/tts-panel.tsx` |
| Validation：卡片级 voice 面板持久化插件配置结构 | 已完成 | 卡片 voice 已写入通用结构 | `src/app/components/business/editor-item.tsx` |
| Validation：`mergeTemo` 发送通用插件 payload | 已完成 | 当前合成请求已满足 | `src/app/stores/dataStore.ts` |
| Validation：历史页可重新打开重构后的记录 | 部分完成 | 代码已支持新结构和 legacy 迁移，但缺少真实宿主往返数据的联调验收 | `src/app/components/business/tiptap.tsx`、`src/app/pages/history/history.tsx` |
| Immediate Scope 第 1-4 项 | 已完成 | 本次主线改造已覆盖 foundation / provider / panel / merge 流程 | `src/app/lib/tts-plugin.ts`、`src/app/components/business/tts-panel.tsx`、`src/app/stores/dataStore.ts` |

### 对这份文档的总评

- 结论：`tts-plugin-refactor.md` 的主线目标已经完成大半，当前最准确的整体状态是“主流程已落地，最终态未完工”。
- 最大未闭环项：分段级 richer field types 与剩余交互收口。
- 最大验收空缺：没有完成 `pnpm build` 和真实 Electron host 联调。

## 二、`docs/electron-host-adapter.md`

说明：这份文档中的“真实宿主仓库尚未拿到、只能参考 MemoAITranslate”的前提已经过期。实际宿主接入已在
`F:\Develop\electron-react` 落地了一部分，因此本表会同时区分“实现状态”和“文档本身是否需要更新”。

| 目标条目 | 状态 | 当前实现结论 | 主要依据 |
| --- | --- | --- | --- |
| 宿主目标：`memo-tts` renderer 保持 plugin-only | 已完成 | 当前 renderer 主路径已经是插件化链路 | `src/app/stores/dataStore.ts`、`src/app/components/business/tts-panel.tsx` |
| 宿主目标：按 `pluginId` 解析真实 TTS 插件 | 已完成 | `electron-react` 已有 `resolvePluginContext(...)` | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 宿主目标：预览和合成走同一套插件管理契约 | 已完成 | `synthesize` 与 plugin merge branch 都按插件实例调用 `textToSpeech(...)`；仅额外保留旧分支兼容老调用方 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 宿主目标：TipTap 编辑器可以异步请求动态字段选项 | 已完成 | renderer 和 host 两侧都已接好 `getPluginEditorOptions(...)` | `src/app/lib/tts-plugin.ts`、`F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| “真实宿主仓库不在当前可见范围内” | 文档需更新 | 这个前提已失效；当前已知真实宿主是 `F:\Develop\electron-react`，且已完成部分桥接改造 | `F:\Develop\electron-react\docs\memo-tts-plugin-host.md` |
| “MemoAITranslate 只是参考实现来源” | 文档需更新 | 这个定位仍成立，但不应继续把它写成“宿主待接入仓库” | `docs/electron-host-adapter.md`、`F:\Develop\electron-react\docs\memo-tts-plugin-host.md` |
| 宿主必须支持 `window.AIM.plugin.readLocalPlugins()` | 已完成 | 当前 renderer 初始化依赖该接口，宿主侧原有能力仍在 | `src/app/stores/pluginStore.ts` |
| 宿主必须支持 `window.AIM.plugin.getProviders("tts")` | 文档需更新 | 当前 renderer 主路径不依赖该接口；文档把它列为“必须支持”已经不准确 | `src/app/stores/pluginStore.ts`、`src/app/interface.d.ts` |
| 宿主必须支持 `window.AIM.plugin.saveConfiguration(...)` | 已完成 | 当前链路仍依赖该接口保存插件配置 | `src/app/stores/pluginStore.ts` |
| 宿主必须支持 `window.AIM.tts.synthesize(...)` | 已完成 | `electron-react` preload / main handler 已接通 | `F:\Develop\electron-react\electron\preload\bridge\tts.ts`、`F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 宿主必须支持 `window.AIM.tts.getPluginEditorOptions(...)` | 已完成 | `electron-react` 已有 preload / main handler / helper 文件 | `F:\Develop\electron-react\electron\preload\bridge\tts.ts`、`F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| 宿主必须支持 `window.AIM.tts.mergeTemo(payload, uuid, extra)` 的插件 payload | 已完成 | `electron-react` 已在 `mergeTemo` 入口增加 plugin branch | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| Preview payload 契约 | 已完成 | renderer 与 host 均使用 `provider + pluginId + text + options + returnBuffer` | `src/app/components/business/tts-panel.tsx`、`F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| Merge payload 契约 | 已完成 | renderer 发送的结构与 host plugin branch 匹配 | `src/app/stores/dataStore.ts`、`F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| Dynamic editor option request 契约 | 已完成 | renderer 请求形状与 host helper 相匹配 | `src/app/lib/tts-plugin.ts`、`F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| Preload / bridge 暴露新接口 | 已完成 | `electron-react` preload bridge 已补 `synthesize`、`getPluginEditorOptions`、plugin merge typing | `F:\Develop\electron-react\electron\preload\bridge\tts.ts` |
| 宿主共享 helper：resolve plugin context | 已完成 | 已有等价实现 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 宿主共享 helper：运行时配置合并 `defaults -> stored -> runtime -> host-added` | 已完成 | 虽未完全按文档中的 helper 名称拆函数，但逻辑已经在 `callPluginTextToSpeech(...)` 中落地 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 实现 `tts.synthesize(...)` | 已完成 | 已存在统一插件试听接口 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 实现 `tts.mergeTemo(...)` 的插件 payload 路径 | 已完成 | 已存在 plugin branch，并保留旧 built-in branch 兼容老调用方 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| `mergeTemo` 不再按 `Edge/OpenAI/Volcano` 分支 | 部分完成 | 新 plugin payload 已不再分支，但旧调用方分支仍保留，属于兼容性保留而非完全删除 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| Edge 动态 `voiceName` 选项 | 已完成 | 已在 helper 中支持 | `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| OpenAI 动态选项无需补充 | 已完成 | 当前静态 manifest 选项即可 | `src/app/lib/tts-plugin.ts` |
| Volcengine 动态 `scene / voiceType / emotion` 选项 | 已完成 | 已在 helper 中支持 | `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| ElevenLabs 动态 `voiceId` 选项 | 已完成 | 已在 helper 中支持 | `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| Azure 动态 `voiceName` 选项 | 已完成 | 已在 helper 中支持远程查询 | `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| 推荐顺序 Step 1：先做 `tts.synthesize(...)` | 已完成 | 已落地 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 推荐顺序 Step 2：再做 `tts.mergeTemo(...)` 插件 payload | 已完成 | 已落地 | `F:\Develop\electron-react\electron\main\handlers\tts.ts` |
| 推荐顺序 Step 3：再做 `tts.getPluginEditorOptions(...)` | 已完成 | 已落地 | `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| 推荐顺序 Step 4：补各 Provider 具体动态选项来源 | 已完成 | Edge / Volcengine / ElevenLabs / Azure 都已接入 | `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts` |
| Practical note：如果 host 不实现 `getPluginEditorOptions(...)`，编辑器能力会不完整 | 已完成 | 当前结论仍成立，且现在 host 已实现，因此这个风险已明显下降 | renderer + host 现状 |

### 对这份文档的总评

- 结论：宿主实现本身大部分已经落地，但 `docs/electron-host-adapter.md` 的仓库边界和实施前提明显过期。
- 最该做的文档动作：把这份文档改写为“参考设计 + 现状差异说明”，或者直接在开头注明“真实宿主实现已迁移到 `F:\Develop\electron-react`，请以 `F:\Develop\electron-react\docs\memo-tts-plugin-host.md` 为准”。

## 三、最终验收结论

如果把两份文档当作“最终态目标”来验收，当前项目状态可以概括为：

- 主流程改造：`已完成`
- 历史兼容与过渡：`已完成`
- 宿主桥接：`已完成`
- 分段级插件字段编辑：`部分完成`
- 文档同步准确性：`部分完成`
- 构建与真机联调验收：`未完成`

最值得继续推进的下一步只有两件事：

1. 继续补齐分段级 richer field types、voice 路径统一化，以及更多依赖宿主动态选项的字段场景。
2. 补一轮构建和 `electron-react` 联调验收记录。
