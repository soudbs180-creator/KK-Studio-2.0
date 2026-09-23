# Review：KK Studio 2.1.0 版本元数据与源码上传

- Task ID：REL-2.1.0
- 状态：SELF-REVIEW + 独立源码补审 PASS WITH FOLLOW-UPS
- 审查类型：当前 agent 自审；另有独立 AI 上下文审查 `c3fbcb8`，不是平台第二账号审批。
- Base SHA：`origin/main@3c4d012846e53095bd4f11343a1cd2ef61aa3bbd`
- Head SHA：独立预检 `c3fbcb85bd207bfd11a6600a43e4b9f61d944ef0`；最终受审源码 `15f1f2792ab9cc7d3202c9ff97b040b7e013254d` / tree `ae2bbbb79ad80783194268dae41882258571a6cf`。后续仅交付记录补录提交，以 Git ref 回读其 HEAD。
- 规则：当前 checkout 的 `AGENTS.md`、`AI_RULES.md`、`docs/engineering/REVIEW.md`、`BRANCH-POLICY.md`。

## 需求价值

用户需要将已有源码候选上传并明确版本；统一版本元数据能让 Web、Desktop、插件和 MCP 客户端在同一发布候选中可追溯。该需求与当前 2.0.0 融合基线后的兼容功能增量一致。

## 实现质量检查

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| 版本源完整性 | PASS | `VERSION`、package/npm lock、Cargo/Tauri、运行时显示均为 2.1.0 |
| 重复硬编码 | PASS | App/Account/Plugin/MCP 改用 `appVersion`；测试夹具为 2.1.0；依赖包和历史证据除外 |
| 数据身份 | PASS | 存储 key、identifier、项目/设置/画布 schema 版本未被版本更新改动 |
| 凭据/秘密 | PASS（范围内） | 新增/修改版本文件未含真实凭据；仓库既有测试 fixture 的 secret-shaped 字符串仍仅作测试数据 |
| 冲突标记 | PASS | 未发现行首 Git 冲突标记；Rust `==========` 为既有章节注释，文档中的示例为字面说明 |
| 文档边界 | PASS | 明确源码上传、安装包未生成、PR/CI/main/tag 未完成 |
| 测试 | PASS（本地） | 367 单测、299 production preview 浏览器及插件定向2项、UI159/0、治理59/0、功能29/0、格式/build/78 Rust 均通过 |

## 发现与处置

- 当前工作树包含多项此前未提交的 Agent/UI/规则/文档候选；用户本轮明确要求上传，因此按发布流程整体提交，但不清理其他 worktree。
- 独立 AI 预检在 `c3fbcb8` 发现 P1：HTTP 插件代码在应用权限下执行。加载器现限制 HTTPS、拒绝响应降级和旧 HTTP 缓存执行，新增 3 项单测先失败再通过；设置界面显示插件权限提示。补审 `56468c3` 又指出 HTTPS→HTTP→HTTPS 中间跳转无法从最终 URL 看出，已增补远程下载 `redirect: error`，第 4 项单测先失败再通过。独立补审在 `15f1f27` 复核该路径，结论 PASS WITH FOLLOW-UPS，范围内无未关闭 P0/P1。
- 同一预检发现 P2：Desktop CSP 拒绝插件 `blob:` 模块；登记 PLUGIN-DESKTOP-001，FEAT-013 已将能力限定为 Web preview，正式桌面插件验收保持未完成。
- `gh` CLI 不存在；GitHub Desktop 发布因其 PATH 缺少 `node` 被预推送钩子拦截，随后在本机终端保留钩子正常执行完成 push；PR/CI 状态以平台回读为准。
- `releases/` 被 `.gitignore` 排除且当前不存在；不把安装包路径写成已生成事实。

## 结论

- 需求价值：PASS。
- 实现质量：本地候选 PASS；远端 SHA 回读后仍需平台独立 review/CI 才能作为正式发布结论。
- P0/P1/release blocker：已确认的 P1 明文插件路径已修复并经独立补审关闭；正式发布仍被 PR/CI/main、安装包、Desktop 插件和真实服务验收阻断。
- 独立审查：初次独立审查提出 P1/P2；最终受审源码 `15f1f27` 范围内无未关闭 P0/P1，Desktop P2 保持开放。AI 补审不能替代平台 review。
- 后续：远端源码分支已与首次推送 SHA 核对；不要声称 v2.1.0 已合并或正式发布。
