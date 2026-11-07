# Verification：Figma 优先规则

- Task ID：TASK-FIGMA-FIRST-20261021；日期：2026-10-21。
- Base：`1fbac26b33bdabaad682ad398f5292360eb9c66a`；branch：`docs/TASK-FIGMA-FIRST-20261021-rules`。
- [Spec](spec.md) / [plan](plan.md) / [review](review.md)。
- 日志与原始读取：`D:/kk-studio/output/logs/figma-first-20261021/run-01/`。

## 已核对

- 开工前 `npm run governance:check` 与 `npm run markdown:check` 均退出0。
- 旧 Figma 文件四个规范节点返回不存在。用户指定新文件后，`91:2` 规范页七章正文、24个共享 Text Styles、Geometry 27个与 Icon Weight 1个变量已只读核对；未写外部 Figma。
- 设计差异：思源黑体、正文16/24、强调正文500、页面标题28/36、菜单圆角12、图文图标12/16及描边矩阵、1200内边距/1201布局独立断点。规范已更新目标，CSS 与 YAML 保留既有实现。
- 产品代码/版本/用户资料不在本次 diff 范围；全部开工前 status 条目及原暂存文件状态保持，未执行 stage/commit。原始 index hash 受 Git 元数据刷新影响发生变化，不作为 staged blob 一致性的证明；最终 staged blob 清单另存，未冒称进行了开工前后 blob 比较。

## 当前验证结果

| 检查 | 结果 |
| --- | --- |
| markdown / index / governance / snapshot | 均退出0；Markdown 131个现行文件、账本162任务零违规 |
| lint / typecheck | 在本次 verify 中通过；typecheck 独立执行也退出0 |
| 全量 Node 测试 | 2259通过、0失败、20跳过；总数2279 |
| Agent build / test | 构建通过；204通过、0失败、2跳过 |
| ui:check / design:check / design:lint | 退出0；Google lint 的既有 YAML 警告未掩盖，生成 YAML 与 HEAD LF归一化后一致 |
| DESIGN.md 文档读取定向测试 | 1通过、0失败 |
| 本次 JSON 格式与 diff 空白检查 | 通过；未重排既有任务账本记录 |
| npm run verify | 退出1，停在 format:check；85个格式问题文件与本任务范围交集为空 |
| test:ui / 完整 test:design / test:development | NOT RUN：verify 在格式门禁处停止，未绕过或全仓格式化 |

独立上下文完成三个新增场景的文本演练，均 PASS；发现的旧模板扩展禁令 FIGMA-R01 已局部修正，复核见 [review](review.md)。live 模型 benchmark 为 NOT RUN；文本演练不证明模型遵守率。未提交工作 diff 的审核仅为预检。

规则和派生文档已写入本地；完整交付状态为 PARTIAL。未提交、未 PR、未合主线，原因是完整 verify 未通过且原检出有其他任务暂存内容；不夹带或修整这些改动。产品 UI、浏览器/Tauri 视觉与真实 Provider 不在本次文档验收范围，未宣称已迁移或发布。
