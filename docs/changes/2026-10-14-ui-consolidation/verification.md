# Verification

- Task ID: `TASK-UI-CONSOLIDATE-20261014`
- 日期：2026-10-14
- 状态：BASELINE IN PROGRESS；整体 UI/协议/轻量化仍 PARTIAL / NOT VERIFIED。

本阶段没有实现新的产品 UI；当前冻结 Desktop/Web 2.1.17、Mobile规划2.1.1。完整主目录恢复输入为 `196be1de6b785b99b07d5409c0e617ecda3de43d`。本机盘点104登记树/150本地分支/103remote refs/10tags，36个dirty树；41个补充恢复refs覆盖36个来源，40个CONSISTENT、1个VOLATILE；原index/HEAD变动0。一次读取期间变动的Cherry测试文件不作为精确源副本证明。

输出目录：`D:/kk-studio/output/ui-consolidation-20261014/`。其中 inventory-agent 下 recovery-verification.json、recovery-snapshots-all.json、recovery-refs.csv、primary-snapshot.json 提供源路径、排除路径、hash、ref和tree。敏感标记文件仅留path/hash，未打印或复制秘密；原件保留。

当前版本、typecheck、build 退出0；Node首次1096项（1082通过、14既有skip、0fail）。UI标准224文件/0违规；Agent和插件build退出0。缺失插件生成输出已补齐，将重建生产dist后验证。Bundle create/verify均退出0，SHA256 `672f2a6a6b3879f8f0b2154fce4669e9b21c821a7728b4d9b272298f32d480e1`。

Lint首轮在当前工作树容器路径选择失败；正确设置 `KK_CONTAINER_ROOT=D:/kk-studio` 后发现旧生命周期门禁把日期当UTC instant，误拒绝当地2026-10-14。已先RED证明，再使用项目Asia/Shanghai日历日期；日期/完整docIndex回归21/21通过，未来日期及无效日期仍拒绝。原失败日志保留在输出目录，未关闭门禁或改写旧日期。

`npm run verify` 的 lint、typecheck、Node1099（1085通过/14skip/0fail）、Agent174（172通过/2skip/0fail）、UI224/0、全量格式检查和production build均通过；浏览器阶段因1423被其他验证占用退出1，开发阶段未执行，不能称完整verify成功。首次失败日志/exit原件保留。

端口自然释放后，生产浏览器 `npm run test:ui` 于实际preview1423运行515个spec：514 expected、1 flaky、0 unexpected/skip，command exit0。flaky为 `task-intent.spec.ts:270` 的native submit/key identity场景，首试line436等待durable状态unknown超时5000ms，自动retry通过。当前产品JS/CSS与日常primary相同，不能归为本轮日期门禁导致，也不能据此确认根因。完整首试JSON已保存 `baseline-browser-results.json`；原error-context未单独保存，后续runner清理，不能宣称该原件仍在。

拟做五次zero-retry定向复证时，1423已被另一foreign preview占用（首轮owned process已退出）；定向运行未开始，不记为PASS，不reuse旧server或kill外来任务。静态回执校验保证key mismatch应进入unknown，但跨queued/running/unknown持久化边界的超时根因仍UNKNOWN。必须复证后才能把冻结版升级为稳定集成/发布候选。

插件补齐后当前dist150文件、5,050,790 bytes，包含5份插件输出；与日常primary当前Web构建内容匹配，少生成物没有当成轻量化。正式Tauri、Hosted、安装器、真实Provider与用户产品验收仍未运行。整体UI/协议/轻量化仍未实现，任务保持PARTIAL。

原 node_modules 与 Agent node_modules 是现有 consolidation 工作树的 junction；本轮不运行会改共享依赖的根 npm ci。检查能证明这份本地工作环境，不称为全新独立依赖安装验收。

## 已提交冻结与补充复证

`df7379053bbd6b941da4e0c0029b1a4d56f33f57` 已提交本机源冻结和方案；产品src/src-tauri/vendor/scripts-agent/scripts-windows/config/package/public相对完整主目录快照196be1de的diff为0。Web归档150文件逐项hash与当前primary dist一致，zip逐项hash也一致。收据 `baseline-receipt-df737905.json` 绑定当时commit/tree，不改旧收据冒充后续head。

端口再次释放后，2026-10-14 的5次单worker零retry定向场景全部PASS，报告 `baseline-flaky-repeat2-results.json`；它证明该条件下可复证，不闭合12workers完整首试超时的根因。首试flaky继续保留，正式稳定验收仍开放。

开发插件原件 `development-plugins/receipt.json` 是FAIL：联接字体目录超出Vite默认fs.allow而403。仅放行真实node_modules目录，保持strict/deny与loopback/strictPort；新增真实HTTP父目录AGENTS403断言，没有放行整个主checkout。配置/开发测试修复提交为 `694e3d18e2fea39edb18bd7b9d0f589673283060`，在该已提交head重新运行开发5步骤PASS、errors0：字体与四插件实际加载/编辑/禁用恢复/危险远程拒绝/依赖父目录继续403。证据 `development-plugins-committed/receipt.json`，不使用dirty运行的旧sourceHead代替。

这两项修复只涉及文档门禁与开发服务，不改变应用产品版本或上述生产Web文件；未递增镜像版本来制造“最新发布”。UI重整仍按spec/plan实施；所有候选的稳定主线整合和Native/Hosted仍未完成。
