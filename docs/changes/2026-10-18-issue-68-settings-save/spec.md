# Spec：Issue 68 设置保存与关闭同步

- Task ID：`TASK-ISSUE-68`；方案状态：LOCAL VERIFIED，完整verify及真实native通过，实现提交C1独审PASS，最终文档head/Hosted待验；日期：2026-10-18。
- 关联：[intent](intent.md)、[plan](plan.md)、[既有任务账本](../../governance/task-ledger.json)。
- 实现基线：`6b933f4ffd80cdd5ca2d3508678a4562fc2b02d8`。
- Source of truth：[native lifecycle](../../../tests/desktop/taskhost-lifecycle.mjs)、[设置导航回归](../../../tests/browser/settings-navigation.spec.ts)、[ModelProviderSettings](../../../src/components/settings/ModelProviderSettings.tsx)、[busy 传播](../../../src/components/settings/useSettingsBusy.ts)及[SettingsPanel](../../../src/components/settings/SettingsPanel.tsx)；本文件限定本专项验收，不复制持久化协议。

## 用户行为与入口

- 主流程：主页“模型”→“模型接入…”→填写连接→保存→确认完成→关闭设置→再次打开模型菜单并使用保存的连接。
- loading：native 保存待决时保留设置导航/关闭保护，不把点击动作返回当成持久化完成。
- success：native 测试在保存点击后等待“官方 API Key 配置”区域内含准确“连接信息已保存。”回执的 status 可见；正常点击关闭后断言设置 dialog hidden，再打开模型菜单。
- error / timeout：保留失败及弹窗现场，不报告成功，不继续依赖保存成功的操作；重试沿用既有契约，不重复写入或丢弃输入。
- cancel / Escape / offline：不新增交互语义；保存期间关闭 disabled、Escape 和遮罩保护沿用既有契约。浏览器既有延迟测试补充 hold 期间无成功提示、release 后成功回执、正常关闭及模型菜单可见断言。
- 不新增布局、颜色、焦点规则或响应式界面；受影响关闭入口需按既有测试验证。

## 架构、数据与权限

- 修复仅涉及两份测试的完成条件与回归断言，无 `src` 产品变更。浏览器 controlled native commit gate 在原产品源码上 2/2 通过，独立只读诊断支持最小修复测试同步。
- 不新增状态源、队列、IPC、schema 或依赖，不改变原生持久化、凭据存储、用户数据身份及重启恢复契约。
- 延迟注入仅用于受控测试，不能成为生产等待或扩大超时；真实 native 延迟由外部独立脚本复用 `provider-credential-recovery` 的 fetch/postMessage 与 callbacks Map 暂扣真实 commit 回执，不进入提交源码。日志和回执不得包含 API key 或其他秘密。
- 无权限扩大、外部服务调用或费用；本次局部同步修复不需要新增 ADR。若调查发现需要公共契约变更，先记录并重新评估范围。

## 平台能力

| 能力                            | Desktop                                                  | Web                      | Mobile     | 边界                                   |
| ------------------------------- | -------------------------------------------------------- | ------------------------ | ---------- | -------------------------------------- |
| native 保存后关闭并重开模型菜单 | 真实延迟实验 13/13、正式 native 11/11 通过               | 无 native runtime        | 不在范围   | 两份回执均 `passed=true`、凭据清理完成 |
| 共享设置 busy/关闭保护          | 原产品源码浏览器 gate 2/2 与真实 native 延迟保护检查通过 | 浏览器既有延迟回归补断言 | 不新增实现 | 不变更产品源码、已发布 Web 版本或部署  |

## 生命周期与恢复

- 初始化、升级、旧 schema、导出和卸载无变更；无需数据迁移。
- 正常保存、延迟完成、写失败及关闭保护是本次相关路径；持久化及重启恢复实现保持不变。
- 原工作区、旧工件与用户资料只读保护。撤回候选通过后续评审决定，不 reset 原工作树、不清理现存数据；本任务没有生产回滚授权。

## 验收映射

| Intent AC | 预期状态/结果                                   | 检查/运行环境                                    | 证据要求                                     |
| --------- | ----------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| AC-1      | 保存完成、busy 解除、弹窗消失、菜单可见顺序明确 | 延迟 native 保存实验及生命周期回归               | 原失败、注入条件、修复前后结果与实际环境身份 |
| AC-2      | 待决和失败保存不能绕过保护或伪报成功            | 既有设置锁定及相关定向回归                       | 保留有效断言，无 force-click、放宽超时或跳过 |
| AC-3      | 单一 Issue 的审阅候选                           | 当前 base/head diff、检查、独立 review、draft PR | 精确 SHA、命令结果、CI 与剩余限制分别记录    |

## 风险和决策

- FACT：浏览器 gate 2/2 在原产品源码上证明 hold 期间关闭 disabled、Escape/遮罩不能关闭；release 后 success→正常关闭→dialog hidden→模型菜单可见。
- INFERENCE：CI 中关闭点击被 busy/关闭保护拦截的具体机制仍缺事件轨迹；原工件最终保存成功不能证明点击时已完成。修复明确测试完成边界，不宣称完整还原 CI 事件机制。
- FACT：`native-delay-evidence-v3/receipt.json` 的真实回执延迟实验 13 checks 全部通过，`passed=true`、`credentialCleanupComplete=true`；其中 hold 时无提前成功提示，关闭 disabled、Escape/遮罩保护均有效，释放后正常关闭通过。`native-final-evidence/receipt.json` 的正式 native 11 checks 全部通过，`passed=true`、`credentialCleanupComplete=true`。
- 前两次替换冻结的 Tauri invoke 失败属于 hook 未安装的注入方法失败，原记录保留，不计为产品失败或通过结果。
- 本地最小测试修复、完整verify及C1提交独审已完成；最终文档head补审、Hosted与主线集成仍独立验收，任务保持REVIEW，不标整体DONE。

本地收尾追加：完整 verify exit0，产品浏览器827首试/0flaky/skip、设计41+8、开发态4步，Node1852/20既有skip、Agent199/2既有skip；Rust213/1ignored+41通过。此前进行中描述保留原阶段含义，以 verification 本地收尾为准；C1提交独审已PASS，最终文档head补审、draft PR及Hosted仍独立待验。
