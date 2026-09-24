# TASK-PROV-004 review — 独立上下文评审记录

- 日期：2026-09-24
- 评审对象：feat/TASK-PROV-004-claude-landing（head 1c36d89）
- 状态：**NOT VERIFIED（待独立上下文评审）**

## 已完成的自查清单（实现上下文内）

- [x] 复用而非复制：claude-provider-config 导入 003 的 providerKey / parseModelWindow / assertNoSecrets / writeFileAtomic；只新增 settings.json 合并与落盘。
- [x] 保守合并边界：只写受管键（env.ANTHROPIC_BASE_URL、顶层 model）；permissions/hooks/env 其他键逐字段保留；非法 JSON 抛错不覆盖。
- [x] 密钥纪律：只写 baseUrl（含 userinfo 拒绝）；输出 assertNoSecrets；认证通道（宿主 env 注入 → agent 进程 → claude 子进程继承）说明在文档与 remaining，不落盘。
- [x] 健壮性：UTF-8 BOM 容忍（CLI 读配置 + 既有 settings.json 两处）；原子写盘 0600/0700。
- [x] 冲突规避：未触碰 claude.ts 执行逻辑、server/http.ts、config.ts。
- [x] 门禁：agent 套件 150/150、根门禁全绿（见 verification.md）。

## 待独立评审重点

1. 「未给出 model 则保留既有 model」的取舍（保守 vs 清理过期受管键）——本批选择保守保留，后续可在端点任务中显式覆盖。
2. 多连接 baseUrl 不一致时以第一个为准 + 警告的策略是否足够（settings.json 单 env 限制）。
3. 认证注入链路的 Windows shell 继承语义需实跑确认（remaining 已登记）。
4. 三个堆叠 PR（#16/#17/#18）的合并顺序与 vendor 文件三方核对。

## 审阅规则声明

同一 GitHub 身份不能批准自己的 PR；不伪造第二审阅人。独立上下文评审应在 PR 创建后由另一个会话/审阅者执行，结论回填本文件。

