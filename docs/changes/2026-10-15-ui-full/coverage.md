# 本轮可达 UI 覆盖与验证边界

## 当前2.1.29新增覆盖（2026-10-15）

| 范围 | 当前证据 | 边界 |
| --- | --- | --- |
| 三种CLI卡片三宽 | 390/1099/1920共9有效RED→9GREEN；Native7三工具实际样式 | IPC视觉shim不证明真实CLI安装/登录；Native5原56项漏测该块 |
| 全页面/卡片/旧项目组合 | verify7 Edge756首试/0retry；Native7共78/0error/12图 | 具体能力沿用原矩阵，不扩写每插件三宽或外部执行 |
| TaskHost与隔离证据 | current4无注入11PASS；Native7前后4正向IPC自检 | 历史同式guard安全结论撤回；受控readiness不等actual3根因 |

完整统计、哈希、失败和安全勘误集中于[最新验证](verification.md#2129-当前本地验收)。当前REVIEW/整体NOT_VERIFIED，最终head独立审查、Hosted/Delivery、普通PR59合并及main/post-main仍待验；Mobile2.1.1规划和原功能成熟度不变。

## 原需求与历史阶段记录（原文保留，最新状态以上方为准）

Task ID：TASK-UI-FULL-20261015；2026-10-15；状态 REVIEW / NOT_VERIFIED（本地2.1.28验收PASS，最终SHA/Hosted/PR/main待验）。当前提交基线为2d4be5fca4c2167d4bc0d500634645624f311505，其上最小设置竞态修复与版本2.1.28尚未形成最终SHA；历史已验收产品为241f3050124ad7773ced0b47a55629373177205e；固定main694已本地承接为1653966f。下列为入口映射及各次收据范围，241产品源码及test-only音频定位修正已通过完整verify-3与Native56；最终提交head及Hosted/PR/main仍待验。

用户追加纠正后，本矩阵是覆盖入口清单，不是全卡片验收通过。旧79定向GREEN和green-checkpoint的50 GREEN保留原scope；其工具栏存在/几何断言不能证明空态仅upload与内容态toolbar互斥，部分旧断言须按新用户契约补充负向状态断言。

页面均从 `/` 内存页面状态进入：`src/main.tsx → App.tsx`；App 的 StartPage、目录页及 lazy Modal renderer 为实际入口。没有独立 URL 的旧页面不作为可达页面。统一几何收据复用 `tests/browser/uiPageRules.ts`，不复制数百选择器。

| 可达面 / 状态 | 真实入口与 owner | 本轮及既有覆盖 | 边界 / 最小补验 |
| --- | --- | --- | --- |
| 首页、发现分类/灵感卡 | StartPage / StartComposer | ui-full-pages：390/1099/1920；既有首页滚动/分类/弹层 | 初屏几何检查不等于每张滚出视口的卡；长文案与底部滚动依赖原回归 |
| 项目库、真实项目/文件夹、历史恢复 | SidebarProjectEntry / project-library renderer | sidebar-real-projects、sidebar-project-groups；ui-full-cards 长草稿、ui-full-legacy-cards 旧态恢复 | 普通项目菜单本轮发现旧几何并新增 RED；保留改名/删除/移动/恢复行为 |
| 扩展目录 Skill / MCP / 伙伴 | CatalogPage / SkillLibraryPage | ui-full-pages 默认 Skill；既有 settings-scroll 三 tab 键盘与手机命中 | 当前分类 UI 不代表 MCP/伙伴真实外部执行已完成 |
| ComfyUI 目录与设置 | catalog-page-comfyui / ConnectionSettings | ui-full-pages 三宽；ui-architecture；ui-full-settings | 390 目录测试先从1099实际入口打开再收窄，只证明窄布局，不证明手机新增入口；真实 Comfy/GPU 另验 |
| 搜索、项目结果、收藏/标签 | CatalogPanel / CanvasCollectionToolbar | ui-full-pages 三宽；sidebar-real-projects 搜索真实 ID；canvas-collection-panels | 搜索 Agent 查询为一个状态；其他类型由原功能测试覆盖，不能据单查询宣称全结果类别视觉一致 |
| 资源库、创建主体、详情、加载更多 | assets/AssetPanel、CreateSubject、AssetProvenanceDetail | ui-page-rules；ui-full-pages 新增 subject/asset-detail 各三宽；asset-performance 125 条分页夹具 | 旧弹窗/按钮 RED 已落盘，本轮已接共享 owner；分页复用真实 fixture，不以空列表代替 |
| 提示词库及预览 | PromptLibraryPanel | ui-architecture 空态/目录卡/预览；frontend 既有功能 | 保持一个加载入口；历史/外部数据不宣称真实同步 |
| 任务列表、审批、六阶段工作台 | TaskExecutionApproval / TaskWorkbench | ui-page-rules：390/1920 Queue/Prompt/Generate/Review/Export/Plan；task-workbench、task-intent | 当前失败/阶段 fixture 范围；不代表付费提交/外部执行完成 |
| 个人信息、帮助、快捷键 | AccountPopup / InfoPanel / ShortcutsPanel | ui-full-pages 三宽；sidebar 禁用原因与跳转；design-corrections 快捷键三 tab | 账号禁用项和设置/更新跳转必须保留；8px图片文字已移除 |
| 普通应用/项目菜单、画布菜单 | TopBar、SidebarProjectEntry、canvas-tools | menu-boundaries 新几何 RED；sidebar-real-projects 菜单断言；既有焦点/Escape/切模态 | RED 8/9px外框与5/6px条目已复证；1099响应式串入40px中间失败保留，已有green-menu-final 2条GREEN |
| 图片、视频、文本、音频输入 | CanvasNodeContent / PromptCreationNode | ui-full-cards 图片/视频/文本三宽；video/audio 4500字浏览器重开；canvasDraftRecovery 7500字 codec | 四个 domain kind，没有独立 prompt kind；音频三宽完整编辑几何仍主要依赖共享 owner，不能扩写未跑证据 |
| 旧图片 pending/error、旧视频 ready/error、旧 text/audio ready | CanvasNodeContent / shared toolbar | ui-full-legacy-cards：六态×三宽，删除/undo/redo、原件/草稿/位置、无提交 | fixture 的旧态恢复不代表真实 Provider 成功；非法恢复态保留禁用原因 |
| HTML、Markdown 与其他插件卡 | PluginNode / plugin registry | ui-full-legacy-cards HTML/Markdown 390/1920选中顶部动作与源码预览；缺失插件回退；既有 pluginFlow | SVG/便利贴等由原插件回归覆盖；本轮没有为每个插件添三宽穷举，也不虚报新增类型 |
| 所有模型 caller / 重绘 / Google / Agent | 共享 ModelPicker 与各 caller | ui-full-models；model-picker；google-cli-agent；另一专项审计 | search Enter/IME 不提交草稿；Google选型为组件会话状态，reload恢复不属原持久化契约 |

设置按 `SettingsSectionData.tsx` 的 11 个稳定 ID 与四组导航生成；`ui-full-settings.spec.ts` 从同一常量遍历全部分类，390/1099/1920 三条测试均 PASS，长内容另滚到底部再次取证。不是按几份固定截图猜覆盖。

| 设置组 | 实际分类 | 额外状态测试 |
| --- | --- | --- |
| 个人与外观 | general / account / usage | settings-control-usability 320/390/1099/1920触屏与主题保存；page-alignment；storage-usage-settings |
| 模型与工具 | providers / extensions / comfy | providers API/CLI细节与迟到/失败；extensions Skill/MCP/伙伴 tab；settings-latest-layout 长名称/窄宽；Comfy 未配置禁用 |
| 数据与隐私 | storage / network / memory | 原件/项目导入导出/本机服务；network禁用原因；memory开关/损坏数据/清空取消确认 |
| 应用 | advanced / updates | advanced恢复偏好两阶段确认；updates真实能力状态与窄栏布局；全分类首屏/底部统一检查 |

`inspectPage` 只检查与视口相交的文字和指定共享动作类，检查字体>=12、标准动作24/32/40、Primary数及水平边界；它不会自动验证每个原生 menuitem、所有离屏内容、容器纵向可达性或每个圆角。因此普通菜单须进入后量直接条目；长面板须滚动；保留原行为断言，不能把一次 helper 调用当成全部验收。

生产证据固定 `http://127.0.0.1:1423/`、真实 Edge、Vite preview、`data-runtime-entry=src/main.tsx` 与 production mode。当前已有79条定向 GREEN；完整 verify、版本更新后的 Desktop、exact SHA 独立审查、Hosted/PR/main 均待实际收据。390为响应式Web，不是原生Mobile。

## 卡片状态与真实动作必验清单（新增，未完成）

| 类型 | 空 / 有内容的实际依据 | 必验状态与功能链 | 当前判定 |
| --- | --- | --- | --- |
| 图片 | 无原件/无可用结果 与 已归档可预览媒体；prompt/选中不当内容 | 空upload→有效上传→唯一toolbar→预览/替换/下载/喜欢/标签/删除→撤销/重开；运行/failed/unknown互斥 | root重新审计修复；旧“选中即toolbar”GREEN不满足 |
| 视频 / 音频 | 无媒体 与 本地上传/已归档可播放结果；generationIndex不当内容 | 上传取消/成功、播放/替换、运行/失败/未知、删除撤销、原件哈希与长草稿重开 | 新互斥/完整链待新增证据；旧恢复/尺寸证据保留 |
| 文本 | 无实际正文/结果 与 已有文本；输入prompt与输出正文分别判定 | 空态无内容toolbar、有内容编辑/复制/删除，streaming/失败/取消、重开/undo保留正文 | 不虚构文件upload或未实现能力；按当前入口明确适用边界并验收 |
| HTML / Markdown / SVG / 便利贴等实际插件 | 插件metadata实际内容/渲染 与 空metadata；不因plugin字段存在就当内容 | 空/有内容唯一动作、编辑/预览/导出真实链、插件缺失/失败、zoom命中、重开 | 旧HTML/Markdown工具栏GREEN只证原路径，新增互斥未验证 |
| 历史 collection / 旧恢复 / 缺失原件 | codec与当前原件/正文共同确定；历史pending/error本身不当内容 | 初开与重开一致；同卡活动/别卡活动/无执行者不同显示；无自动提交/无假播放 | checkpoint50含SSR上下文断言，但不代替真实DOM互斥与完整链 |

每行按空态、有内容、运行/等待/审批、失败/取消/离线/unknown、reload/undo/recovery分别记录入口、正向动作和必须不存在的动作。真实Browser在390/1099/1920实际点击后核对状态/保存/请求次数，再由当前Desktop同态确认；缺能力明确不适用/禁用原因，不用fixture宣称真人Provider/CLI/MCP/GPU成功。

分类与同类入口检查须同时验证：唯一选中的导航/tabpanel；Skill应用只加指令，伙伴只加职责不假连接，MCP保存/连接/调用/断开分别反映真实状态，模型接入保存/检测/连接/断开分别显示；任务running/paused/failed/unknown可用动作与真实执行谓词一致。页面几何helper不覆盖这类语义冲突。

同类入口专项确定任务工作台重试谓词冲突：status看似可重试但submissionState unknown/submitted或活动retry child已封锁slot，UI仍可点且App静默return。已新增task-workbench.spec.ts四条“重试动作遵循”真实Browser RED，等待root复证后修复；静态真实组件证据/分类结论在工程外functional-entry-audit.md与task-workbench-retry-static-proof.json。分类归一化已见源码及既有测试，没有把有意兼容入口标成重复bug。

重试专项的原4条Browser RED已实证，现修复共享availability并扩展HUD/详情/矩阵Caller断言；待root统一新build GREEN。Skill/MCP/伙伴/模型接入分类没有确认额外重复bug，仍需状态矩阵验证。模型状态5失败仅3个有效产品RED，其余Codex连接fixture/API textarea前置假设保持不适用，不计成已复现的型号锁缺陷。媒体新互斥6/6是真实RED，卡片由原owner修复中。


## 当前组合覆盖结果与剩余门禁（241）

165首轮完整production Browser为740 PASS/5 FAIL/0flaky，覆盖矩阵尚未整体GREEN。实际新回归是rightpan与首页16:9；另外screen320/390两项旧40px预期及L/G空image内容toolbar夹具按当前32px/空仅upload规则纠正。正式review追加text纯prompt正文分类与audio坏src两条有效RED；原错误证据均保留。

241的14条定向GREEN覆盖上述三P2、首页比例、窄宽32px生成与真实uploaded image快捷键、多宽audio READY、损坏image/video/audio可读失败。165完整轮已覆盖六条空态互斥含reload、五条model-state及工作台/HUD/detail受理unknown/submitted与live child fence；区域重试4条SSR补充通过。旧79/50只保留原范围，SSR仍不能补Native几何和真实点击。当前完整verify-2、新Desktop同态/资源身份、最终精确SHA review、Hosted/PR/main/post-main均待实际回执。


241最新补充：当前官方隔离Native56checks/0errors、10截图通过，明确验证image-empty无toolbar、uploaded无主upload、重开archiveID与唯一toolbar及资源字节一致性；exact data root关闭通过。精确source241/integration241复审均PASS、三P2 CLOSED。完整verify-2与最终文档head/Hosted/PR/main尚待回执，整体继续NOT_VERIFIED。


最终覆盖收据：verify-3生产Browser747/747 PASS、无flaky/skip/实际retry；完整Node/Agent/lint/typecheck/UI242/0/format/build/development PASS。verify-2唯一audio selector双匹配为夹具定位问题，改为可见预览dialog并断言hidden audio保持paused后，严格播放2条及完整套件通过；原746/1失败保留。Native56/资源身份与source241/integration241复审PASS继续有效；真实Provider、用户最终接受及Hosted/PR/main不由这些本地收据代填。

## 2.1.28新增覆盖与证据断点（首轮文档冻结时）

- Hosted54 push38645320833：Repository verify exit0，Browser746 PASS/1 sidebar flaky；目标折叠文件夹首试缺失而retry1通过，原缺trace，根因UNKNOWN。Native在旧模型配置按钮失败，8项检查不构成完整Native PASS。
- Hosted2d push38647654947：Browser746 PASS/1 FAIL，目录刷新case初试与retry都把B字段恢复成A；原747本地全绿不覆盖此产品竞态。
- 冻结settings-race-red-2对真实select连续change B→A：3/3 FAIL；最小字段同步layout修复后settingsDraftRetention七case×六次42 PASS、0retry/flaky/skip，覆盖dirty/clean刷新、账号与分类隔离、trim/save、秘密不持久化。race-red-1有22:50:20.475Z测试源变更，只保留单case诊断含义。
- Native TaskHost当前菜单/官方API表单/精确模型选择及四结果持久草稿夹具，实际旧release2.1.27为11 PASS/0error/credentialCleanupComplete=true；durable intent/restart、未知slot不普通重试、幂等及秘密隔离保留全部断言。此收据未覆盖2.1.28。
- Desktop/Web2.1.28已构建；当前完整verify、fresh Native及同字节资源、最终SHA独立复审与Hosted/PR/main/post-main仍PENDING。Mobile2.1.1为规划；既有各版本的747 Browser/56 Native保留原范围。

详细证据文件与来源见[最新阶段验证](verification.md)。

## 当前2.1.28完整覆盖收据

verify-6完整exit0，production Browser747全部首试PASS；文档owner独立遍历747 tests/747 results确认retry0、无flaky/skip/失败。Node1304 PASS/14既有platform skip、Agent199 PASS/2skip、lint/typecheck/UI242/0/format/build及development四步骤通过；settings42定向重复作为竞态补证保留，混合源码race-red-1不作整轮冻结收据。

fresh官方Native5 56 PASS/0errors/10截图，包含空image无toolbar、uploaded唯一toolbar/无主upload、重开归档身份及settings版本2.1.28；root实查fresh WebView profile参数并目视空态/重开/更新三图。新版TaskHost11 PASS/0error/credentialCleanupComplete=true，真实四结果提交、耐久intent/重启恢复、unknown无普通重试、幂等及秘密隔离通过；五自有app退出。verify-6后input/EXE与Native5同哈希、reason=current。

Native2/3/4的旧版本硬编码/CDP早连/default WebView非fresh前提失败保留5/0/49 checks，不能当作产品PASS或干净运行证据；Native5从新空profile重跑才完整通过。2d PR quality38647660224的settings首fail retryPASS与Native旧菜单FAIL也保留。当前747与sidebar五轮cold probe仅证明本轮未复现，原Hosted sidebar缺trace根因UNKNOWN。

当前组合本地PASS；最终提交SHA独立source/integration审查、新Hosted及PR/main/post-main仍待验。390仍仅响应式Web；Native Mobile2.1.1规划、真实Provider与用户最终接受不由本轮fixture/本地收据代填。精确资源哈希与失败边界见[verification](verification.md)最新阶段。
