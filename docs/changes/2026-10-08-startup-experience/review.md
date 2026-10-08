# Review：桌面与网页启动体验

- Task ID：TASK-LAUNCH-001；源码审查状态：PASS（已审SHA见下）；最终组合SHA补审收据另存；日期：2026-10-08（Asia/Shanghai）。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。
- 初始base：5dd6e6dddaf00cf2d5c14ae02ef5974c72238232；已审源码head：694a2378849ef18d9a0ad2552737680dd9130a20、f74548dabe01c6810ffee56b77a5b9925394db98。最终集成base为origin/main@1af0357b，精确最终HEAD需与工程外`startup-review-final-20261008.md`回读匹配。
- root self-review：当前实现满足静默/新鲜度/数据身份/首屏/历史边界；完整 verify、client:check、新 Tauri 运行和 Web 同态对比已通过。实际用户快捷方式切换仍待正式审查后执行。
- 独立上下文 `/root/startup_review`（fork none，未指定模型覆盖）读取规则、真实源码/diff 和日志；dirty 预检 CHANGES REQUIRED，无 P0/P1，两项 P2：LAUNCH-R1 百分号路径展开、LAUNCH-R2 慢请求失败后焦点丢失。root 已按 RED→GREEN 修复，正式提交绑定补审仍待执行；不能把实现者的通过替代 reviewer 复验。
- reviewer 独立 production 探针还确认初次搜索定位挂载/选中/聚焦 Canvas 节点、延迟成功后“通用”焦点及 Escape 回焦，pageerrors=[]。首次临时 HTTP origin 缺少 secure-context crypto，改 HTTPS host 后验证，不归因产品。
- reviewer 外部临时夹具清理遭自动审批拒绝（仅返回 blocked by policy），保留 `C:/Users/Administrator/AppData/Local/Temp/kk-launch-review-19963617d5ee445e80cc58ae1e082c8f`；未绕过、未改 checkout/index，不阻断产品验收。
- 尚未发生最终独立审查、远端 CI、用户产品验收或合并发布；dirty diff 的复核只作预检，不冒充提交绑定的最终审核。

## 提交绑定审查与最终组合

- 独立reviewer正式复核694a237：源码PASS；LAUNCH-R1/R2独立执行复验关闭，没有新增finding；收据`D:/kk-studio/output/startup-review-694a237-20261008.md`。增量f74548d对重装LAUNCH-R3独立native3/3复跑PASS并关闭，收据`startup-review-f74548d-20261008.md`。上方“尚未发生”句子为最初预检状态，不能代替这些后续收据。
- 推送前主线加入PR#36；本任务树merge并保留能力复查、两边治理记录和全部99项上游task，加入本任务共100项；版本自动递增Desktop2.1.7/Web2.1.8。完整组合verify726Node/172Agent/413browser零flaky、clientcheck、新Tauri、实际GUI冷重建/最新release免构建、图标、原生能力声明回归均PASS，见verification最终段。
- root self-review：相对最新main的任务差异仍仅启动/Logo/首屏逻辑及必要测试/文档；不会覆盖上游能力逻辑，不改变数据身份。main历史证据的空白保持原样，`git diff --check origin/main`仅检查本任务差异；自动生成schema的物理换行差异已取证后仅恢复本轮生成文件。
- 最终组合独立补审由原独立上下文读取实际已提交diff/源码/hash/runtime/AC执行，不让实现者代填；精确base/head和结论存工程外最终收据，PR绑定当前head。Hosted、用户验收和发布授权独立记录；不得自行批准或合并main。

## Hosted 后的 LAUNCH-R4 补审

- 7a1c3358首次精确本地审查PASS后，PR#38的Hosted verify在WSH TargetPath失败；独立ACP936探针与本地emoji路径RED确认新P2 LAUNCH-R4，旧结论不能作为当前可合并门禁。原收据和失败日志保留。
- root用显式IShellLinkW/IPersistFile修复写入和before-metadata的Unicode边界；测试独立Shell.Application读回，保留原断言，增加二次安装metadata检查并真实执行lnk。native3/3、完整verify726Node/172Agent/413browser零flaky再次PASS；实际桌面宽接口重装/图标目标收据齐全。
- 修复后正式独立补审需绑定新提交，收据`D:/kk-studio/output/startup-review-unicode-20261008.md`；不得改旧收据SHA或用dirty预检代替。Hosted/人工GitHub审批/用户最终验收与发布授权分别记录；草稿PR不合入main或部署Web。

## 临时目录别名与最终收据

- 独立6fe7ccb Unicode审查PASS/R4关闭；后续Hosted仅在Target严格比较8.3短名RUNNER~1与长名runneradmin时失败。reviewer核读两份原日志，确认fixture创建前原生realpath及同一目录cleanup guard两行修改合理；全部产品断言保留，未修改产品源码。
- 本次native3/3和完整verify726Node/172Agent/413browser零flaky PASS。本机无TEMP短名别名，额外探针只记GREEN；真实RED来自Hosted。最终已提交SHA需补审并写`D:/kk-studio/output/startup-review-canonical-temp-20261008.md`，旧6fe审查留档；Hosted与用户/发布门禁单列。
