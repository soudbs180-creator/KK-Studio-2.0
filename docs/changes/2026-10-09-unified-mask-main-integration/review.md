# Review：统一 Mask 主线整合

- Task ID：TASK-IMAGE-EDIT-001；当前组合 NOT_VERIFIED，待提交精确SHA后独立上下文复审。
- main base 1d6f640ac6f3a1e7af32c38d85596527704dc54a；原e7 source与最终docs独立PASS仍仅对应78cea基线；IM-001–013历史CLOSED不改写。
- 重点：所有原Mask核心hunk与新主线行为同时保留；上方工具栏/焦点/双击/删除来源灯箱；lazy首页/设置与40px原生标题栏；字段/恢复/像素/串行任务/凭据清理；全量日志和产物身份。
- Hosted/正式合并/合并后main CI须实际检查，不以旧审查或本地测试代填。

## MASK-INTEGRATION-001

- P2；验证 driver；merge-blocker，root 负责当前复验。
- 实际 27bdb8b 原生模型能力检查中，重绘框的原图读取 status 与模型不支持提示 status 并存，旧宽泛 role 定位发生 strict-mode 错误。原失败日志 native-model-27bdb8b.txt 保留。
- 最小修复只约束实际 GenerationStatus 类和唯一 status 属性，原能力文案/按钮禁用/零任务/原件保护断言不放宽；浏览器同类两处同步修复。产品源码、权限、API 和产物不变。
- 当前修复尚待提交和原生/全量/独立复验，不预填 CLOSED 或 PASS。
