# Review：Figma 优先规则

- Task ID：TASK-FIGMA-FIRST-20261021；日期：2026-10-21。
- [Intent](intent.md) / [spec](spec.md) / [verification](verification.md)。
- Base：`1fbac26b33bdabaad682ad398f5292360eb9c66a`。
- 自检：只改规则、设计目标及来源路由；CSS→YAML 生成方向不变，Figma→本地的设计先行约束由 AGENTS/UI_INDEX/UI_SPEC 承载。
- 独立审查：只读子代理 `figma_rules_review` 使用全新上下文，读取24份本次文件与保存的Figma来源；未提交 diff 的复核仅是预检，不能冒称已提交 head 的正式审查或 GitHub approval。
- 重点场景：新 UI 是否先完成 Figma；已有目标是否免重复编辑；来源失效能否停住依赖工作；旧 CSS/文档与 Figma 冲突如何处理；design:check 是否被误当设计验收；原 staged 工作是否保留。

第一轮发现 FIGMA-R01 / P2：UI_ARCHETYPES 仍禁止新增第六种模板、要求仅返回已有类型，与新 Figma 来源允许同步扩展矛盾。已核对原文并局部改为按 Figma 确认后同步类型/选型/注册表/共享实现与验证，未修改运行时注册表。

三场景 `figma-first-ui`、`figma-source-unavailable`、`figma-derived-docs` 的独立文本演练均 PASS。YAML 未变、tokens.css 无 diff，字阶/描边/圆角/间距/层级/双断点与保存的 Figma 证据一致。未在线重新刷新 Figma，未运行 live 模型 benchmark，未审其他产品 dirty 内容。

FIGMA-R01 经同一独立上下文定向复核为 CLOSED / PASS：§2、§3 与 §5 已一致，未发现修订引入新矛盾。完整 verify 的85个范围外格式问题仍使整合门禁未满足，不以文档复核替代它。
