# Intent：上传 KK Studio 2.1.0 源码候选

- Task ID：REL-2.1.0
- 状态：IMPLEMENTED
- 日期与提出者：2026-09-23，当前用户
- 请求来源：用户请求“帮我通过 Git 本地软件上传代码，上传并且检查，版本更新至 2.1.0”。
- 用户授权范围与依据：更新应用版本元数据、检查当前工作树并将当前源码候选上传到现有 Git 远端；用户没有授权删除历史分支、修改用户数据、绕过分支保护或伪造安装包/生产发布。
- 关联账本、spec、plan：本目录 `spec.md`、`plan.md`、`verification.md`、`release.md`。

## 用户原意

把当前 KK Studio 工作区通过本地 Git 上传并检查，应用版本改为 2.1.0。

## AI 工程转译

在当前已确认的 `D:/kk-studio/KK-Studio-2.0` 工作树中，保留现有功能和文档改动，统一运行时版本元数据到 2.1.0，补齐版本记录，执行适用的本地检查，提交到任务分支并推送到已配置的 `origin`。历史证据中的 2.0.0 保持原义；未生成的安装包不写成已发布。

## 目标与非目标

- 预期结果：应用、npm、Tauri、插件运行时和 MCP 客户端报告 2.1.0；当前源码候选可追溯到一个提交并上传到远端任务分支。
- 包含范围：版本元数据、界面版本显示、CHANGELOG/发布记录、当前工作树已有代码与文档的提交和上传、版本与仓库一致性检查。
- 明确不包含：删除旧分支或归档、修改 `%APPDATA%/kk-studio` 或凭据身份、直接推送 `main`、绕过 hook/ruleset、宣称真实 Provider/云端/安装包已发布。
- 受影响平台/模块：Web/桌面版本显示、npm/Tauri 元数据、插件/MCP 宿主版本、发布文档和 Git 交付。
- 已有实现和规范来源：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/BRANCH-POLICY.md`、`docs/governance/PROJECT_STATE.md`、`package.json`、`src-tauri/tauri.conf.json`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | 应用版本显示为 2.1.0 | package/Tauri/运行时版本搜索和定向测试 | Web/Desktop |
| AC-2 | 当前源码上传后可在远端任务分支追溯 | 推送输出、远端 `ls-remote`、提交 tree SHA | Git |
| AC-3 | 检查结果真实可追溯 | `npm run verify` 或明确记录失败/未执行项、staged diff 和 review | 本地/CI |
| AC-4 | 用户数据身份和历史 2.0.0 证据不被改写 | 存储 key/identifier 检查、历史文档审阅 | Web/Desktop |

## 假设、风险和决策

- FACT（直接证据）：当前 checkout 为 `chore/TASK-CONSOLIDATE-200`，HEAD 为 `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`，远端为 `https://github.com/soudbs180-creator/KK-Studio-2.0.git`，工作树包含此前未提交的功能与文档改动。
- INFERENCE（假设及风险）：用户的“上传代码”包含当前工作树已有改动；这些改动先按差异统计和门禁检查，再整体提交，避免只上传版本文件而遗漏已授权候选。
- UNKNOWN / CONFLICT：没有 `gh` CLI，远端 PR/Hosted CI 是否可创建需由 Git 服务端和后续平台回读确认；当前不把本地通过等同于 main 合并或正式发布。
- AI 自主决定的技术事项及理由：在任务分支上传，不直接推送 `main`；版本 tag 等待通过 PR/CI 的 main 提交，遵循分支规则。
- 必须由用户决定的产品语义/范围事项：无；当前请求已授权源码上传和版本更新。
- 外部条件、费用或不可逆动作及已有授权：推送远端是用户明确要求的外部写入；不触碰生产服务、付费服务或用户数据。
- 不在本次范围的问题与账本 ID：真实 Provider、ComfyUI、Tauri 实机安装、移动设备和正式发布仍按现有账本状态处理。
