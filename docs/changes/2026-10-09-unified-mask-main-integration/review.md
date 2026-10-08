# Review：统一 Mask 主线整合

## 当前正式独立补审

精确base 1d6f640ac6f3a1e7af32c38d85596527704dc54a → head eaa0886e99965d00a5a514b301adb665b150373d，source与runtime结论见[原始完整报告](evidence/current-eaa0886/review-runtime-eaa0886.md)。MASK-INTEGRATION-001当前独立复验关闭；既有开发插件FAIL按开放TASK-PLUGIN-DEV-001保留，范围局部PASS不能代替该未完成能力。随后仅文档/evidence变更，最终doc head须新独立补审；Hosted/普通合并/main CI以实际回读为准。下方预检与修复记录保留当时时间含义。

## 当前 self-review

Root按实际base/head diff与原需求复核27核心/3迁移App hunk、两类节点的App灯箱路由、上方toolbar与CSS顺序、104上游账本保留和425来源hash；亲自执行并读取两次完整445browser、102Rust、fresh Agent build及多组原生/三宽度生产Web收据，实际查看原生editor/lightbox/selected-reference和production390截图。旧role歧义先复现FAIL后仅修driver，未删除有效能力/请求断言。开发插件FAIL及冷启动timeouts仍明确未解决，不以fixture推断付费效果、手机、High IL或用户视觉。当前实现相关scope自检PASS；独立审查是上述独立原文，不能由本self-review代填。

- Task ID：TASK-IMAGE-EDIT-001；当前组合 NOT_VERIFIED，待提交精确SHA后独立上下文复审。
- main base 1d6f640ac6f3a1e7af32c38d85596527704dc54a；原e7 source与最终docs独立PASS仍仅对应78cea基线；IM-001–013历史CLOSED不改写。
- 重点：所有原Mask核心hunk与新主线行为同时保留；上方工具栏/焦点/双击/删除来源灯箱；lazy首页/设置与40px原生标题栏；字段/恢复/像素/串行任务/凭据清理；全量日志和产物身份。
- Hosted/正式合并/合并后main CI须实际检查，不以旧审查或本地测试代填。

## MASK-INTEGRATION-001

- P2；验证 driver；merge-blocker，root 负责当前复验。
- 实际 27bdb8b 原生模型能力检查中，重绘框的原图读取 status 与模型不支持提示 status 并存，旧宽泛 role 定位发生 strict-mode 错误。原失败日志 native-model-27bdb8b.txt 保留。
- 最小修复只约束实际 GenerationStatus 类和唯一 status 属性，原能力文案/按钮禁用/零任务/原件保护断言不放宽；浏览器同类两处同步修复。产品源码、权限、API 和产物不变。
- 当前修复尚待提交和原生/全量/独立复验，不预填 CLOSED 或 PASS。

## 文档收尾复验

六份当前交付文档已格式化并消除源eaa plan额外Prettier提示。账本首次收尾被现有DONE门禁正确拒绝：verification混入另项/历史的FAIL和NOT VERIFIED文字；原门禁不变，现在该字段只描述已完成的本任务scope，完整负面条件保留verificationLimits、既有开放任务和本包原文，修订前后见[元数据记录](evidence/current-eaa0886/doc-governance-metadata-correction.json)。首次lint因该Shell未补Node npm到PATH未进入后续链，原日志保留；使用同Node24并补task PATH后实际lint/版本/目标/治理/功能/链接门禁通过。不能将工具PATH问题伪装产品失败或删除其他已知FAIL。最终doc head将独立补审上述变更。
