# Review：范围与能力边界

- Task ID：`TASK-UI-CLASSIFY-20261013`
- 交付包角色：`current`
- 日期：2026-10-13

状态：Focused independent PASS（未提交 working tree 预检）。本轮范围内无确定剩余 P0/P1/P2；全量产品验收仍受三个既有 UI 失败限制，账本保持 REVIEW/PARTIAL。

分类按用户确认落地：模型接入管理 Codex 主 Agent、模型账号与 API；扩展提供 Skill 指令、MCP 工具和协作任务角色。伙伴使用已接入模型执行任务，不重新登记账号；自动分派不同模型和真实第三方 OAuth 仍属开放能力，UI 明确说明/禁用。

并行实现交叉复核发现并关闭四处真实回归：来源列表焦点竞态、重复定位器清空内层滚动、项目角色未追加到 Agent 私有草稿，以及更换模型保留旧能力声明。额外补齐原始 opaque credentialRef、离开 API 取消迟到响应、保存期间控件/接入方式禁用。原有故障覆盖保留；仅更新已改变的入口与准确输入 locator。

最终 fresh reviewer 独立复现 CUI-R1 同地址账号凭据误用、CUI-R2 Google 配置草稿丢失及 CUI-R3 Google 角色写入 API 草稿。三项修复后以实际源码内存断言 6/6、当前 production bundle 浏览器断言 6/6 关闭；独立抽查 Web development/preview 各 7 项和 Desktop 14 项，以及全量浏览器 492/495、本轮 20 项均通过。

用户补充移除模型弹层的批量/数据后，独立动态 8 项断言通过：菜单无数量/隐私/生成设置，搜索和模型选择保留，旧草稿数值不被改写，标准图片节点数量仍可切到 4。40 项定向测试通过，修改后的全量仍为 492/495；双 Web 各 7 项、最新 native Desktop 14 项均通过。原 CUI-R1/R2/R3 关键源码哈希保持不变。

审查绑定 base/HEAD `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c` 的未提交候选；运行 bundle SHA-256 `4e85ce08eb0e86536b314c0ba9f8a40fda56f4c79a719ded8d787a709b4e7f2e`、EXE `b826ed68c120d651fd2d1427501024df974751748b2e45f01df84f82d0163130`。49 份运行输入、43 份变动测试和四份预存保全哈希已由独立 reviewer 与最终持久回执核对，暂存区未变。

三客户端实际结果、指纹、无关改动保全和未完成项见 [verification](verification.md) / [runtime evidence](runtime-evidence.json)。本轮不将本地 UI、native IPC 或 fixture 通过提升为外部模型、发布或用户验收。
