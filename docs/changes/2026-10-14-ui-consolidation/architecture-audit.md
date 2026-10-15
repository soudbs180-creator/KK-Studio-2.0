# Architecture audit：UI 规则、目录和体积基线

- Task ID：`TASK-UI-CONSOLIDATE-20261014`
- 日期：2026-10-14 / Asia/Shanghai。
- 状态：只读审计完成；以下规则修改、布局、优化和新守门器均为待实施方案。
- 读取范围：当前冻结候选、原日常 checkout、标签候选及 Git 登记的 104 个工作树。仅写本文件；未改源码、依赖、运行数据，未清理、移动、终止进程或操作 Git 状态。
- 候选目录：`D:/kk-studio/.worktrees/branch-consolidation-20261011`；审计时 branch 为 `codex/TASK-UI-BASELINE-20261014`，HEAD 为 `47d35a10e758376fa5b3cf4b33c9c19c76818140`。父任务继续维护交付文档，文档体积和数量是本次读取时的观测值，不能替代最终提交清单。
- 当前需求来源：[intent](intent.md)、[spec](spec.md)、[plan](plan.md)。本报告是该任务的审计证据，不新建平行规范入口。

## 1. 结论与实施顺序

现有项目已经有唯一规范入口、token、领域/宿主边界、版本身份和运行证据要求，不需要重建第二套体系。主要问题是旧规则与用户新要求冲突、CSS 几何分散，以及当前入口混入较长历史流水。轻量化应先测量输入和输出，不能用删除功能、忽略插件或不随包 Agent 作为减重成果。

先冻结并提交可恢复的当前版本，再按最新 main 的任务内容整合候选；之后重整唯一 UI 规范和共享控件，实施设置、画布面板及搜索。文档/目录/包体门禁并行设计，产物优化在具备相同功能与恢复证据后再验收。当前前端 build 不代表这些后续工作完成。

## 2. 新要求覆盖关系与代码根因

| 新要求 | 当前证据 | 最小落地与验收 |
| --- | --- | --- |
| 默认绿色、中性白色主要操作，颜色用于状态/风险 | `src/domain/settings.ts:7,23-24,35` 默认仍是蓝紫；`tokens.css:191` 默认 `#635bff`；`ui-governance.css:62-66` 与 `ui-tokens.css:198-213` 将 Primary 绑定强调色。`UI_RULES.md:117` 仍指定紫色 Primary | 只调整默认/缺省选择，保留显式保存的其他颜色及原存储 key。将主要操作、强调、选择、成功和危险分别定义为语义角色；深浅主题验证颜色和文字/图标反馈 |
| 圆润胶囊、居中、按文字扩展，正常完整、超长才截断 | `workspace.css:1327-1339` 卡片模型固定 129px、图片 106px 并省略；`composer.css:761-782` 首页桌面模型最终 88px；`:847-880` 对话模型固定 58px且左对齐；`:1141-1148` 窄屏隐藏真实模型名并显示“模型” | 共享 Button/ModelControl 区分内容尺寸与容器上限，图标固定槽、文字可收缩，普通名称不省略；长名称提供完整可读描述。不靠增加页面级覆盖修复 |
| 上传方形圆角 | `composer.css:831-838` 上传32×32且圆形；`:1121-1129` 再将首页/对话上传覆盖为 full radius；`workspace.css:1102-1114` 图片上传也是 pill | Upload/IconButton 与文字胶囊分族，使用现有控制圆角与图标命中区。正常、hover、pressed、focus-visible、disabled 同态验证 |
| 输入时没有外侧明显边框 | `composer.css:3-22` composer 外壳仍有 border；`:31-54` 内部 textarea outline 被移除；`global.css:268-273` 普通输入有弱焦点 outline；设置另有局部 focus/box-shadow | 在共享输入外壳消费中性弱层级，去掉输入期间明显外框/发光；保留克制的键盘 focus-visible。输入、键盘、IME、错误消息不能失效。不要全局关闭可访问焦点 |
| 设置二/三栏 | `components/settings/settings.css:21-39,92-101` sidebar/content 使用固定 absolute 几何；`SettingsPanel.tsx` 由导航选择一个 section | 保留 SettingsSectionData、深链、草稿和保存事务；建立“分组导航→列表/分类→详情”布局，低密度页使用二栏，高密度 Provider/CLI 页三栏。窄屏网页与原生 Mobile 分别设计 |
| 喜欢在卡片顶部工具栏 | 当前 `ImageCreationNode.tsx:134-143` 喜欢在 header；`CanvasImageActions.tsx:71` 顶部选择工具栏是收藏。现有 `CanvasNodeItem.tsx:70-74` 已接 likedIds/toggleLike | 复用现有喜欢状态，接入 ImageSelectionToolbar；避免新建第二个 liked 状态或重复动作 |
| 收藏并入标签；喜欢与标签分别固定大小、可拖动 | 当前 `App.tsx:3144-3178` 全部进入同一 Modal/CatalogPanel。标签候选 `App.tsx:3159-3166` 也只改变 tab | 两个独立面板有独立 open/position、固定尺寸、层级、关闭和恢复；把手拖动不劫持内部按钮、不平移画布。窗口变化后仍可找到面板，布局规格单独登记 |
| 旧收藏保留可见 | 标签候选 `model.ts:538-542` 只恢复 raw.tags，`:914-918` 另存 favoriteIds；`CatalogPanel.tsx:92` 只展示有 tags 的节点，旧 favorites 入口路由标签 | 保留 favoriteIds 数据和旧深链，先通过“旧收藏”兼容标签投影显示，避免用户标记变得不可见；重载、旧快照、重复标签和取消标记回归 |
| 视频上传不跳中心 | `VideoNode.tsx:117-123` 只 patch assetId/preview/title；`CanvasNodeItem.tsx:118-125` 保留原 ID，不写 position。新增节点 `useCanvasNodeActions.ts:104-120` 默认在视口中心 | 当前未复现上传重建/坐标重置，不把猜测写作已修复。补拖动、平移、缩放后上传的 node ID/世界坐标保持断言，区分节点位置、视口自动 reveal 和上传按钮自身定位 |
| 搜索分类优化 | 当前 `CatalogPanel.tsx:27` 有合并“喜欢收藏”分类；标签候选已拆分喜欢/标签并增加类型/标签/来源过滤 | 复用已有查找与标签领域能力；搜索独立查项目、节点、归档资产；喜欢表示偏好、标签表示分类，不与资源库、存储、用量记录混成同一状态源 |

`canvas-tags-likes-ui` 候选 HEAD `f9cab2a2` 干净；实现 `3acd0e13` 与 tip 均不是原日常 HEAD 的祖先。候选已有多标签、自定义标签、资产喜欢和组合过滤；但 `tests/browser/canvas-tags-likes.spec.ts:4` 要求喜欢在灯箱且头部无爱心，与本轮要求相反。按功能内容提取并改写契约，不整分支盲合。参考图中的七类彩色标识、计数、逐类下载、自定义关键词和全部下载，候选尚未实现为该独立面板。

参考图防碰撞/可视范围修复 `fd2234a0` 已是原日常 HEAD 的祖先，现有 `addCanvasReferences.ts` 会指定位置；不能以视频现象推断该提交遗漏。

## 3. 唯一规则入口与可精简内容

### 3.1 当前有效归属

| 内容 | 保留的唯一承载入口 | 其他文件的职责 |
| --- | --- | --- |
| 技术、安全、Git与UI证据硬约束 | `AGENTS.md` | AI_RULES 链接硬约束，不复制细节；兼容客户端入口仅链接二者 |
| 用户与AI分工、授权、事实与交付纪律 | `AI_RULES.md` | PROMPTING 承载意图转换字段，SDLC/REVIEW 承载专项流程 |
| 全文档导航 | `docs/README.md` | 不新增状态或第二份规则正文 |
| UI规则路由 | `docs/UI_INDEX.md` | 按下五项分工，不将旧 Figma/1.3 页面叙述视为当前默认 |
| 交互、按钮族、输入、面板/可访问性 | `docs/UI_RULES.md` | 引用尺寸/主题及测试契约 |
| 页面模板 | `docs/UI_ARCHETYPES.md` | 保留五模板；设置栏数是布局组合，不能另建平行页面类型体系 |
| 实际数值 | `src/styles/tokens.css` | DESIGN_TOKENS 为索引；ui-tokens 只作为兼容映射 |
| 颜色、基础组件用法 | `docs/DESIGN-SYSTEM.md` | 不再复述零件完整状态矩阵 |
| 实际运行身份与UI验收 | `docs/UI_SPEC.md` | 测试工程命令归 TESTING；不定义第二份颜色/尺寸真值 |
| 当前事实、恢复路由、任务、功能 | PROJECT_STATE / AI_HANDOFF / task-ledger / features.registry | 派生看板由已有生成器维护；历史记录回到原 dated change package |

此分工已由 `docs/README.md:54-65`、`UI_INDEX.md:19-36`、`SPEC_BASELINE.md:13-21` 指定；本轮只收紧，不新增第二套规范。

### 3.2 已确认冲突与待整理项

1. `UI_SPEC.md:14-16` 仍引用 DESIGN-SYSTEM 的“1.3/创作输入框/三档尺寸”，当前 DESIGN-SYSTEM 只有颜色、基础组件和验收三节。`:77-81` 仍把部分数值源写成 ui-tokens；应回到 tokens.css，并移除过时章节叙述。
2. `UI_RULES.md:40-43` 保留收藏独立状态、`:64-65` 将标准按钮一概写为8px圆角、`:117` 指定紫色；本轮应改为喜欢/标签语义、文字胶囊与方形上传分族、默认绿且中性主要动作。旧 favorite 数据仅作为兼容保留。历史验收不改写。
3. `governance/UNIFIED-PROJECT-RULES.md:3-8,16-24` 自称候选、拟成为跨主题唯一入口，并给出一套优先级；`SPEC_BASELINE.md:7` 与 AUTHORITY_MAP 的现行顺序另有来源。它虽被 docs/README 索引，不能仅因列入索引就自动成为新的 current 权威。后续需统一裁决：保留现行入口分工，候选内容经去重提取后以明确 superseded 指向，不让每份文件都写自己的层级。
4. PROJECT_STATE 当前约94.6KB/576行，混入大量日期历史；AI_HANDOFF 已约5.7KB/66行，可保留短恢复入口。PROJECT_STATE 后续只保留当前版本/任务/阻断/证据路由；旧段落按稳定来源转成链接，保留历史文件与Git恢复，迁移时核对入链。
5. AGENTS 约15.7KB/92行、AI_RULES约8.1KB/48行，README约18.3KB/180行；简化优先减少重复主题正文和历史数值，不删规则、安全、能力限制或故障恢复契约。
6. `UI-STANDARDS.md`、`UI-ALIGNMENT.md` 是明确禁止更新的重定向存根；继续保留，不重新扩展它们。`docs/superpowers/`、archive 仅供溯源。

守门建议：扩展现有 index/snapshot/markdown/doc-commands 检查，让规范角色有稳定 docId、owner、status、updatedAt、source 和 supersededBy；同一角色仅一个 current。扫描现行索引指向的章节/锚点是否真实存在。当前文档才参与冲突检测，历史材料不因保留旧词而误报。需要“用户此次要求覆盖旧条款”的精确白名单和替代目标，不能粗略删除所有含紫色/收藏的文字。

## 4. 目录归属与跨端边界

| 类型 | 归属 | 守门/注意 |
| --- | --- | --- |
| 产品核心、Provider/任务/资产语义 | `src/domain`、`src/features`、`src/integrations` | 保留现有状态源，领域不依赖React/Tauri/Node；服务端专用模块不能进浏览器 |
| Desktop/Web展示与共享控件 | `src/components`、`src/styles` | UI规则共享；布局不是业务状态源，页面CSS由App统一顺序管理 |
| Desktop原生命令/本地文件/TaskHost/凭据 | `src-tauri/src` | 不把密钥或桌面宿主塞入共享领域 |
| 原生Mobile | 独立顶层 `mobile/` | 尚未实现；只共享经明确抽出且可版本化的平台无关契约/核心，不直接复用桌面页面与CSS |
| 第三方代码 | `vendor/canvas-agent`、`canvas-plugins`、`canvas-proxy`及各自锁文件/许可证 | 不混入用户会话、auth或生产日志；生成dist、node_modules与源代码分开 |
| 设计/演示资产 | `public/design/figma`、`public/fixtures/demo`；插件生成输出 `public/plugins` | 需保留来源/用途；插件文件是否产生是交付完整性条件 |
| 测试输出、编译缓存 | `.tmp`、test-results、dist、src-tauri/target等已忽略路径 | 测量与回收分离。默认不删除，不把“忽略”理解为可丢失证据 |
| 任务证据 | `docs/changes/<date>-<task>/`、`docs/evidence/<date>-<topic>/` | 历史证据可压缩且保留索引/SHA，不能为体积改写原结果 |
| 工作树/工作区盘点 | Git登记树与 `D:/kk-studio/output/<date>-<topic>/` | 容器不是仓库；浅层lstat识别junction，盘点不证明可删 |
| 分享产物 | `releases/`或显式本轮output产物 | 版本、来源SHA、构建receipt、EXE和包hash；不夹带开发缓存/恢复归档 |
| 用户数据/凭据/恢复归档 | DATA-STORAGE、storage-layout与工程外恢复路径 | 本轮未读取APPDATA、凭据或用户原件；不纳入代码包减重或清理 |

原生 Mobile 与 Desktop **共享语义，不共享像素布局**。二者应共享动作含义、状态机、错误/取消/恢复、图标角色和主题语义；Desktop支持鼠标键盘、二/三栏设置及多面板；Mobile采用触控命中区、分级导航、返回、软键盘/安全区和设备存储契约的独立几何。390px Web 证据只能证明响应式网页，不能关闭原生Mobile任务。依据 `AGENTS.md:22-32`、`ADR-011:11-15,33`、`ARCHITECTURE.md:22-26`。

目前 `CODING-STANDARDS.md:48-67` 只强制领域层/服务端边界，components/features 存在双向依赖；不做整库搬目录式重构。新增面板的领域派生、宿主适配与展示边界需有命名和接口，在本次自然职责范围提取即可。

## 5. 前端与依赖体积实测

方法：读取本轮候选 dist 和日常 dist，递归仅限这两个明确产物目录；每层 lstat 跳过链接，不跟随junction/符号链接。记录字节数、JS/CSS gzip(level9)字节数、关键SHA；gzip是离线体积估计，不是实际HTTP压缩/加载时延。未重建第二次、未扫描node_modules和Rust target以伪造全盘占用。

候选 dist：145文件、5,000,154 bytes。JS共12文件、1,124,233 bytes / gzip352,078；CSS1文件313,179 / gzip50,786。日常 dist：150文件、5,050,790 bytes；前端主JS/CSS与候选完全相同。

| 当前候选代码产物 | 原始bytes | gzip bytes |
| --- | ---: | ---: |
| assets/index-DISFBkG2.js | 915110 | 280549 |
| assets/index-DmCQyY8d.css | 313179 | 50786 |
| assets/SettingsPanel-3abbCZxM.js | 109239 | 33918 |
| assets/TaskWorkbench-GZ3t90dj.js | 24190 | 8026 |
| assets/SkillsPage-DmbaSrwc.js | 16179 | 5597 |
| assets/AssetPanel-BOTeDmCA.js | 15660 | 5984 |
| assets/LibraryPage-BpWLeZTl.js | 14946 | 5348 |
| assets/PromptLibraryPanel-DLSmdUV2.js | 12200 | 4837 |
| assets/CatalogPanel-C_T4UtK1.js | 7781 | 3093 |
| assets/PartnerRoles-CsXLAfCY.js | 3959 | 1986 |
| assets/ShortcutsPanel-BmKGFor0.js | 3147 | 1528 |
| assets/InfoPanel-DPKh38BQ.js | 1671 | 1067 |
| assets/x-BLn2I9bE.js | 151 | 145 |

主JS SHA256：`1871a8320c939ab7db21688fff2a39d097768a34d882e24abd1be893ccdfbb77`；CSS：`fe9418f159b6c6174a42291b1a6ba471a6694ce7ac811a7159a90cc76980a6e6`。

其他候选产物：PNG4份2,349,714bytes、WebM1份497,907、WAV1份352,844、SVG115份136,075、WOFF4份124,560、WOFF2四份96,744，其他合计4,898。最大单文件 `fixtures/demo/blue-hour.png` 2,348,046bytes；演示PNG/视频/音频合计约3.20MB，占dist约64%。字体来自 `global.css:1-4` 的四个Inter字重；是否只留WOFF2需先确认目标浏览器和桌面WebView兼容，不默认删除回退字体。

**完整性差异**：候选未生成日常目录有的 `plugins/html.js`3547、markdown39547、sticky-note4240、svg3201和index.json101bytes，合计50,636。这是缺失插件构建输出，不是优化成果。候选源码包含vendor插件，build不自动执行plugins:build；必须在对等功能验收前补构建和真实插件加载证据。

根package：8生产依赖、16开发依赖；根lockfile有305个包节点（290标dev、64标optional，类别可重叠）；Agent独立lock183节点、插件lock48节点。这些是锁文件计数，**不是下载字节/实际安装字节/最终随包数量**。不同宿主分别安装Zod/TypeScript等版本不自动构成冗余；不要为了统一版本升级或删除依赖。

首轮优化顺序：产物完整性→Vite模块贡献图/入口依赖图→按路由和功能延迟加载→缩减重复/不生效CSS→演示大图/音视频等价编码和加载策略→字体兼容验证→Agent包内候选文件。现有Settings等已lazy，不把切chunk数量变多当作首屏更快；测入口加载闭包和首次访问后的总量。没有模块归因证据时，不断言915KB由某个图标库导致。

## 6. Agent运行白名单与交付边界

`scripts/agent/runtime-package.mjs:8-10,34-49,56-101,104-138` 复制Node、Agent dist/指令/许可证与生产依赖图，排除开发依赖元数据和指定会话/日志/凭据路径，拒绝包内链接，并按实际复制文件输出含size/hash的runtime-manifest。它保留npm物理依赖树以避免运行时版本解析改变。

这份manifest是**生成的实际文件清单**；生成即等于已审阅白名单的推断不成立。部署前还需审阅输入用途和检查意外新增文件/路径。目录排除不代表包内README、types、CJS/ESM双产物或大二进制都已做必需性裁剪；不能未经真实Agent启动和导入验证直接删它们。

候选没有 `src-tauri/agent-runtime/runtime-manifest.json`，因此本次dist build不能证明可独立运行的随Agent桌面分享包。日常目录manifest记录win32/x64、Nodev24.20.0、Agent0.6.0，4269文件、111,924,259bytes；其中node.exe93,381,448bytes，约83.4%。这些是manifest声明字节，本轮没有逐项重hash，不能作为fresh发布验证。Node是免本机Node运行的交付依赖，不默认移除。

Tauri普通配置 `tauri.conf.json:10` 指向../dist；agent/installer配置各自把agent-runtime作为资源。安装receipt代码 `installer-receipt.mjs:211-223` 读取manifest、检查平台并逐文件验证size/hash。后续轻量化守门应补“实际包目录与manifest精确一致、无额外未声明文件、所有路径相对且在包内、拒绝链接/凭据/用户数据、许可证保留”的清单检查；版本/receipt/安装器hash和真实启动回执另验。

## 7. 工作树与文档占用：已测/未测

104登记树只浅层检查已知生成目录的存在和链接属性，没有遍历依赖/Rust缓存，也没有得出可删除清单或总磁盘占用。

| 生成目录 | 普通目录 | 链接/祖先链接 | 不存在 |
| --- | ---: | ---: | ---: |
| .tmp | 19 | 0 | 85 |
| node_modules | 29 | 33 | 42 |
| dist | 44 | 0 | 60 |
| test-results | 36 | 0 | 68 |
| src-tauri/target | 17 | 0 | 87 |
| src-tauri/agent-runtime | 6 | 0 | 98 |
| vendor/canvas-agent/node_modules | 18 | 8 | 78 |
| vendor/canvas-agent/dist | 24 | 0 | 80 |
| vendor/canvas-plugins/node_modules | 41 | 3 | 60 |
| public/plugins | 44 | 1 | 59 |

注意：同一个链接可在几个相对路径的祖先被发现；表格不是独立physical目录数，也不能相加为占用。候选根node_modules为指向日常checkout的junction。任何统计必须保留logical path、real path、链接/跳过原因，不能把共享依赖每树重复计入physical bytes。

文档读取时：3276文件约230.16MB；Markdown841文件4.16MB。changes占168.46MB、evidence占54.84MB，主要是证据，不是规范正文。排除changes/archive/superpowers/evidence后，Markdown122份约1.13MB，其中含生成账本视图。TASK_LEDGER.md约290KB、PROGRESS约175KB；历史两份progress归档各93,609bytes且同内容候选需以hash确认重复，再考虑索引化，当前未删除。

`WORKTREE-LIFECYCLE.md` 的68树数量明确是历史，不覆盖本轮104；现有worktree-policy的4树/20GiB是创建门禁，不是当前所有104树可删的判断。后续整合必须保留dirty来源、refs、recovery bundle和SHA清单；正文只链接盘点，不复制104树全表到多个current文件。

## 8. 可执行守门与体积ratchet方案（待实现）

| 检查 | 输入/输出 | 失败或审查条件 | 保功能要求 |
| --- | --- | --- | --- |
| 规则唯一性 | 扩展AUTHORITY_MAP、index/snapshot检查；规范role/docId→唯一current来源 | 同角色多个current、已退役章节/入口仍被宣称现行、命令/链接失效 | 不扫描历史词汇作为现行违规，不改写旧证据 |
| 文档上下文预算 | 只统计“必读入口集”的UTF8 bytes/行数和重复段落hash；生成账本、日期证据单独统计 | 相对接受基线增长超过max(10%,2KiB)时要求说明；PROJECT_STATE向8KiB以内的当前摘要收敛是后续目标，不立即删历史 | 明确迁移映射、链接/锚点验证；账本事实保留，未知/失败状态不省略 |
| UI token/样式所有权 | 共享组件、CSS import顺序、语义token消费；扩展现有ui:check | 页面再次定义按钮几何、增加颜色字面量、普通输入强focus框、上传继承full圆角；存量债按路径ratchet | pointer/keyboard/IME、尺寸文本矩形和三宽度截图验证，不能只做字符串检查 |
| 前端构建预算 | 干净相同锁文件/Node构建的所有dist文件path/bytes/hash、JS/CSS raw/gzip、入口加载闭包和模块贡献 | 以本轮对等完整产物为基线；入口gzip或总JS/CSS增长超过max(3%,16KiB)先审查，未经用途说明不刷新基线；新功能可有经审查的预算变化 | 要同时比较功能清单和lazy路由首次使用；缺插件/素材不计作节省 |
| 静态媒体/字体 | 每文件hash、bytes、类型、来源、使用路径和重复组 | 同内容重复、新未引用大文件、意外格式增量；初次只有报告，明确用途后设按组预算 | 预览质量、原件、离线demo、目标WebView字体回退保持 |
| Runtime/分享包 | 平台版本、Node/Agent、许可证、依赖图、文件manifest、receipt、EXE/压缩包hash | 缺manifest、未声明文件、路径逃逸/链接、凭据/用户数据、dev缓存混入、声明size/hash不符 | 真正离线启动Agent/MCP/CLI、关闭/恢复和已支持任务都验收，Node等必需输入不能为预算删掉 |
| 工作树物理占用 | 浅层lstat默认；后续显式允许路径的内容测量，链接不跟随且按canonical路径去重 | 共享依赖重复计量、根外路径、dirty/活跃任务/恢复证据被当缓存 | 盘点与删除独立；本任务无删除/移动授权，所有结果仅报告 |

所有预算记录应绑定source commit/tree、dirty状态、平台版本、锁文件hash、Node/构建命令及算法，放置于配置中的小基线和CI/本轮output机器清单。基线更新必须说明具体新增功能、消除的字节和保留的能力，不接受“为了过门禁”的提高上限。压缩网络体积、磁盘包体、开发依赖/Rust缓存和AI上下文体积四类分别计量，互不冒充。

现有入口可复用：`ui:check`、`index:check`、`snapshot:check`、`doc:commands:check`、`markdown:check`、`delivery:check`、版本一致性、runtime/installer receipt；新增budget检查不能替代现有行为与交付门。

## 9. 本轮验证与未完成项

- 实际只读检查：规则/索引/实现/import、锁文件、dist文件字节与关键hash、runtime manifest声明、104树浅层链接/目录盘点；未执行清理、依赖安装、runtime打包或UI操作。
- 原日常checkout纯单元：`node --test tests/unit/settings.test.ts tests/unit/addCanvasReferences.test.ts`，15/15 PASS，Node24.20.0。标签候选纯领域：assets/assetLabels/tagModel共11/11 PASS。
- 标签候选文档的48条Web PASS只是旧证据，与本轮顶部喜欢/固定拖动面板契约不同，本轮未重跑浏览器或Tauri。
- 新UI规则、二/三栏设置、固定拖动面板、旧收藏兼容、搜索优化、原生Mobile、自动预算/白名单精确检查均未实现。视频跳中心未复现。候选插件构建与随Agent桌面包完整性仍待补。
- 全组合verify、fresh Desktop、确切SHA独立审查、Hosted CI、用户视觉验收和正式发布由父任务另行完成并绑定本轮证据；本报告不将静态审计或旧历史通过转成DONE/REAL。
