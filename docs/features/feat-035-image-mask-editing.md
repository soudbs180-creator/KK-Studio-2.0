# 图片蒙版编辑（FEAT-035）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-28
- 关联任务：TASK-IMAGE-EDIT-001、TASK-IMAGE-EDIT-VERIFY-002、TASK-MOD-P2

## 用户可见入口

图片节点/生成结果/图片灯箱 → 重绘。框选、画笔、色块产生同一编辑蒙版；无选区时整图连续编辑。

## 代码位置

- src/domain/imageEdit.ts：共享数据契约
- src/features/image-edit：Mask、坐标、区域、上下文、处理和界面
- src/features/creation：现有任务、模型适配、原件归档和恢复
- src/features/capabilities：默认关闭的image.inpaint清单/派发；creation/inpaintCapabilityDispatch接回原任务链
- src-tauri/src/task_host.rs / image_edit_schema.rs：原生传输和包校验

## 测试与证据

源码head64c8b9d正式独立PASS，IM-010–013全部CLOSED，本地TASK-IMAGE-EDIT-001 DONE。跨端vectors/快照缺失保护/清空/色块意见隔离覆盖，旧恢复预算歧义先RED后GREEN。完整root775/783（原8skip）、Agent172/174（原2skip）、browser423/423零retry/flaky、Rust102、fresh Tauri/原生11组通过，Mask外0；reviewer另外执行93定向和四个完整PNG保护探针，71源码/22工件重算匹配。最终文档提交另补审；历史失败保留。Desktop2.1.9/Web2.1.10，外部真实效果仍未验，功能保持PARTIAL。

[本轮验证](../changes/2026-10-08-unified-image-mask/verification.md) / [独立审查](../changes/2026-10-08-unified-image-mask/review.md)。历史源码head dbc88bb独立PASS、IM-001–009关闭：当时完整verify root741/749、Agent172/174（原skip8/2）、browser420/420零重试、Rust100及两端production/重启/包通过，reviewer另跑61定向和实际Tauri。该历史范围与本轮结果分开记录，fixture错误勘误见验证记录。

## 当前能力

统一原像素Mask/历史、5%偶数正方形、反复合并、最多三块串行及整图回退。明确能力时原生PNG mask优先，色块保留标注图，参考编辑fallback仍保护Mask外每一RGBA像素。失败区域独立重试、取消保留成功候选、连续上下文有界；同一灯箱可浏览/下载/重绘/生成新候选/删除。Web/native项目包和原生重启保留编辑证据，已删除节点不复活。

## 差距与后端化

真实付费模型效果、任意语义几何/透视位移自动识别、手机键盘与物理触控、用户最终视觉验收尚未完成，归TASK-IMAGE-EDIT-VERIFY-002。当前按比例检查和人工候选复核处理模型映射风险。Mobile原生应用未改；不以fixture或窄屏截图代替真机证据。保留原有生成服务、权限、归档和unknown边界，无新队列或依赖。

- 2026-10-09：承接main1d后的产品27b/driver-eaa保留选中卡片上方操作栏、App灯箱、lazy首屏及单排标题栏；完整445browser/102Rust和同EXE原生Mask/选择/TaskHost/模型/标题栏/首屏通过，当前独立补审。开发插件既有FAIL不归此次完成，真实Provider/几何偏移/物理手机/用户验收仍VERIFY-002，功能继续PARTIAL；[最新组合验收](../changes/2026-10-09-unified-mask-main-integration/verification.md)。

- 2026-10-28 P2候选：VITE_CAPABILITIES_INPAINT默认关闭；开启经薄注册器把原准备任务交回原Runtime，不重复HTTP/归档、不改UI/存储身份。两构建任务/资产/溯源/请求/DOM同态及单次派发、重载恢复通过；完整image-edit各14 pass/1原窄屏fail。严格PNG仍有录音按钮边缘1灰阶像素不稳定，连续同路径采样也复现；未宣称零差异/原生或真实Provider通过。Desktop/Web源码48、Mobile43，未合main，见[P2验证](../changes/2026-10-28-inpaint-capability/verification.md)。

2026-10-28 P3源码解耦候选：TASK-MOD-P3A，完整R4降至0，业务任务/原件/记忆隐私/凭据与旧存储身份保持；未证明原生、真实外部服务或main已更新，功能成熟度不据此升级。[验证TASK-MOD-P3A](../changes/2026-10-28-p3a-creation-image-edit/verification.md)。

2026-10-29 creation公开入口进行中；[TASK-MOD-P4-CREATION验证](../changes/2026-10-29-p4-creation/verification.md)。既有产品成熟度不因架构重构自动升级。

2026-10-29 其余切片公开入口进行中；[TASK-MOD-P4-REMAINING验证](../changes/2026-10-29-p4-remaining/verification.md)。既有产品成熟度不因架构重构自动升级。
