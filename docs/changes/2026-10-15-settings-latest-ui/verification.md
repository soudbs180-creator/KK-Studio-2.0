# 最新 UI 设置修复验证

TASK-SETTINGS-LATEST-20261015：本地授权范围 DONE / PASS。日期 2026-10-15（Asia/Shanghai）。[意图](intent.md)、[规格](spec.md)、[计划](plan.md)、[独立审查](review.md)。

## 来源与运行身份

- 正确基线：c1fae190618be3bb5a4e00208b8f4776ec8c0be5 / Desktop、Web2.1.24。工作区 D:/kk-studio/.worktrees/branch-consolidation-20261011，分支 fix/TASK-SETTINGS-LATEST-20261015。产品源码冻结2a4e66d154cc61c0ba500bb06b27467b67a782fe；完整门禁head784039e7b9c25f42908acdc67c0430e7c86c27fd；Native测试补修与独立审查head054cd53fffa888a3a3b626917199cbc0b9e0539b。后续文档提交不改变已测产品输入，最终文档SHA另绑定工程外收据。
- Desktop/Web2.1.25；Mobile2.1.1规划保留。标识com.kkstudio.app、storage keys、credentialRef与provider协议均保留；未做配置迁移。
- 官方启动命令：在上述cwd运行 start-kk-studio.bat --background --data-dir D:/kk-studio/.analysis/settings-ui-latest-20261015/desktop-official/data。启动器先判旧收据unverified，按锁文件检查244个本地依赖后重建，才打开当前EXE。共享node_modules引用保留在本次.tmp，原目标不改；本地npm ci --ignore-scripts成功，依赖漂移0。
- 当前EXE：src-tauri/target/release/kk-studio.exe，SHA256 c9c3b4e3295fefebbf1364521e2d45cc612180b6cea618d2bf36b74279242744；inputSHA256 2a09db543e8bdc704d52429514ba8094ab1a2037f9c1b90c447b938dab9961fb。desktopVersion2.1.25，inspectDesktopRelease=reason current / needsBuild false。官方隔离窗口PID66976已正常关闭；日常桌面快捷方式实际打开PID64772，同路径EXE且不带data-dir，继续原用户数据身份。
- Web production：http://127.0.0.1:1423/；Tauri：http://tauri.localhost/。两端data-runtime-mode=production、entry=src/main.tsx、实际加载assets/index-CQ5GFu08.js。入口链main.tsx→App.tsx→SettingsPanel→SettingsSections→ConnectionSettings→ModelAccessSettings→Provider组件，页面CSS由现有App链路加载。

## 本次检查

| 检查                     | 当前结果        | 证据和边界                                                                                                                                            |
| ------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 完整npm run verify       | 退出0 / PASS    | Node1278 pass、14既有skip；Agent199 pass、2既有skip；UI242/0；格式/构建/全部治理门禁通过；Edge629首试通过，0失败/0flaky/0skip；development5步骤PASS   |
| 开发态定向布局及草稿     | PASS            | layout12/12、CodeBuddy确认/取消2/2、草稿及相关交互18/18；source HMR探针无需重启可见且原字节恢复                                                       |
| 生产定向回归             | 29/29，retries0 | design-system-pages、最新布局及草稿；全部有效断言保留                                                                                                 |
| Web/Tauri实际DOM与截图   | PASS            | 1280面板、240分类栏、192接入方式栏；computed accent=#21a673；内容水平溢出0；390手机分类/详情逐级返回                                                  |
| 官方启动器当前Desktop    | PASS            | 锁文件依赖一致、重新构建/收据/EXE/hash/运行进程及当前版本2.1.25回读；5条既有Rust dead-code警告、既有Vite大chunk警告保留，不调阈值掩盖                 |
| 当前Native配置与凭据恢复 | PASS            | 20功能、11视觉、1原生提交后缓存未发布阶段、5无秘密元数据检查；正常保存、重载、强制中断及进程重启保持绑定和原密钥；仅唯一synthetic凭据被触及且清理完成 |
| Native真实目录fixture    | PASS            | 127.0.0.1临时端口，GET /v1/models仅1次，owned Bearer匹配，服务已关闭；不保存配置、不误验证生成，不调用外部Provider                                    |
| 原primary/index保护      | PASS            | index字节SHA保持不变；仅追加最新启动来源指针，原文件先存SHA备份；原源码/并发改动和用户配置身份保留                                                    |
| 启动入口                 | PASS            | client:shortcut重新生成新版工作区GUI入口，Desktop目标/工作目录实际回读；原快捷方式metadata另存恢复副本                                                |
| JS入口预算               | PASS            | 同production构建/Node gzip：冻结2.1.24与本次均962043B、gzip296429B，增量0，预算16384B；无新增依赖                                                     |
| 独立源码/测试审查        | PASS            | c1fae190→054cd53，由独立上下文检查；两P2已闭合，无未关闭finding；最终纯文档另补审                                                                     |

Node24.20.0 / npm11.19.0；Edge/WebView2真实浏览器，非Chromium替身。原始证据统一保留在工程外 D:/kk-studio/.analysis/settings-ui-latest-20261015，文件名不代表PASS：verify-latest-complete.log、browser-accepted.json、production-runtime.json、native-runtime.json、desktop-build-receipt.json、desktop-credential-recovery-final/provider-credential-recovery.json、native-credential-recovery-final.log、shortcut-before.json、shortcut-after.json、daily-launch-process.json、primary-state-correction.json、bundle-budget.json及本次PNG。

## 验收

AC-1至AC-5均在上述本地范围PASS：最新来源、长文案/短屏可达与提示命中、模型busy/取消/失败/草稿、配置身份与恢复、完整门禁及独立源审查。保存连接与保存此模型能力分开，连接操作紧邻输入；测试连接与刷新目录合并；主动清空已有CodeBuddy路径需确认；读取失败保护沿用新版实现。模型、账号、目录及分类切换保留dirty草稿，clean字段更新为最新目录，型号trim不产生第二份目录项。

## 失败原件与修正

1. 旧primary51fccfc7+修复428a3a2d是误选UI基线，仅保留旧范围历史；本次从c1fae190重做。旧2.1.24源码/便携包及已有验收也不代填当前差异。
2. 开发首轮7fail/5pass加载cached原始c1组件；Vite忽略整个.worktrees导致不刷新，现限定内部resolve('.worktrees')。390的lazy/返回可见性竞态改为等待dialog并读取当前导航层；HMR真实探针与新布局12PASS。
3. 草稿RED6失败和CodeBuddy路径重置RED保留；StrictMode初次2GET导致测试误期望1fail/6pass，改为捕获初始读取后断言导航无新增GET/POST，最终18首试PASS。
4. verify-latest.log格式4文件FAIL；修Prettier。verify-latest-final.log为626pass/2title失败/1flaky；保留隐藏模型页时h2重复已修，未弱化标题断言。单次宽图下游端口hit=false重试通过：本次无canvas源码/CSS变更，确切遮挡原因UNKNOWN，几何风险只属INFERENCE；后续628与最终629首试0flaky，但不把重试当旧轮PASS。
5. verify-latest-accepted.log为628pass/1phone测试失败：第二主题循环保留了API detail，测试需通过公开返回接入方式恢复methods再继续原断言。29定向及最终完整门禁均通过。
6. Native首轮旧page.route不能拦截新版Rust原生HTTP目录请求，fixture失败但自有凭据已清理；改为真实loopback服务后20/11/1/5全部PASS。旧FAIL文件desktop-credential-recovery及native-credential-recovery.log保留。

## 未验范围

测试使用隔离Web profile/data目录与唯一synthetic系统凭据。真人CLI/API账号、付费外部模型生成、日常资料全库恢复、Hosted CI、合并、签名安装器/发布、实体手机及用户视觉接受未发生，不属于本次本地设置修复PASS。Mobile保持规划；FEAT-022保持PARTIAL。原始失败、既有skip和旧产物均未删除。
