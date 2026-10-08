# 统一图片编辑蒙版 Implementation Plan

> 执行：superpowers:executing-plans，当前会话串行实现，完成后独立上下文复核。

**Goal:** 三个工具共用蒙版、发送和结果融合，原件安全且可连续编辑。

**Architecture:** 保留 App/CreationTask/TaskHost/归档边界；新增 image-edit 纯领域 Mask 和共享浏览器图像处理。每个独立区域复用一个 task，组内成功结果累计合成。

**Tech Stack:** 现有 React18/TypeScript/Vite/Tauri2/Canvas2D，无新依赖。

**Spec:** [spec.md](spec.md)；Task ID TASK-IMAGE-EDIT-001。

## 继续审查返修（2026-10-08，7532e94 之后）

用户要求继续检查合理性和合规性；独立审查发现 IM-010–013，保留原 PASS 的历史范围，本轮任务重新进入 IN_PROGRESS。按同一已授权目标修正，不新增工程、依赖或发布操作。

1. IM-011：先补恢复回归，原生 request/receipt/journal 独立持久化 `imageEditRequired` 并纳入 fingerprint。Mask 与标注编辑均 true；完整连续编辑 false；旧普通任务缺省保持原指纹。live/recovery 同一校验器拒绝缺失/非法编辑快照，不发布 raw、不自动重发。无 marker 的旧连续编辑记录仅在完整自动 body 与其 lastInstruction 精确匹配整图编译时兼容，其余保守 unknown；不能从素材 tags 推断任务角色。
2. IM-010：Web/Rust 对 document、region、snapshot、crop、context 采用相同 allowlist；显式可选字段独立验证类型/长度，拒绝 unknown/null。先添加 validator/项目包异常输入回归，再修实现。
3. IM-012：工具栏增加独立“清空编辑区域”，复用统一 commit/undo/redo；保留原件、输入、参考图和单调色块计数器。浏览器验证保存重开、清空、撤销/重做、刷新及整图发送。
4. IM-013：UI/连接预检查只用有效结构化意见判断可发送；实际编辑编译使用原始主输入，每个 crop 仅展开自己的区域意见。浏览器验证空输入四区正常发送及两区意见不串区。
5. 共享行为 Desktop/Web 补丁递增，运行完整 verify、Rust/client、fresh release 与隔离原生运行，保存同状态 DOM/截图和构建指纹。提交后独立准确 SHA 复审；全部关闭再更新任务状态。

依赖：测试→各自修正→全集及两端运行→提交→独立复审→文档收尾。实现串行；reviewer 只读，禁止共享 dirty worktree 写入。技术决策来自当前请求授权和仓库证据，不要求形式审批。

### 82b7490 独立复验后的 IM-011 补修

82b7490 的正式结论为 CHANGES REQUIRED：IM-010/012/013 CLOSED，IM-011 的新 marker 已通过，但旧无 marker 的局部意见可引用整图模板并通过尾部比较。原报告和失败脚本保留，不将该 head 改写为 PASS。

1. 先添加真实恢复回归：合法局部编译器产生模板后缀，快照先通过 decoder，再仅删除 imageEdit；预期 unknown、无 raw 读取/发布/重发。同时覆盖整图正常恢复、root/current 引用模板、recent 空白预算与截断、旧 recent 正文边界歧义。
2. 用同一编译器证明完整 prompt：先精确重编译无 recent 的全文；有 recent 时按已知 root/current 推导两种预算前缀，在确定标签边界内提取有界 recent，再精确重编译全文。recent 含第二个完整自动正文头时保守 unknown；显式 false marker 的整图任务仍按确证角色处理。
3. 在同一未发布候选版本 Desktop2.1.9/Web2.1.10 完成定向与完整 verify，生成新 dist/release 并做实际 Desktop 回归；使用新证据目录、源码/工件清单和新 SHA 独立复验。此次只修同轮尚未通过的恢复候选，不另行增加版本或范围。

## Global Constraints

- 原图像素坐标；5%每边外扩；ceil偶数；1000/2500阈值；最多3块。
- 精确模型目录为能力源；不能伪造 size；原件与蒙版外像素不可改。
- 原有权限/归档/持久化/unknown重试规则不变；Desktop/Web分别验证。
- 隔离分支 codex/TASK-IMAGE-EDIT-001-unified-mask，base 1af0357b；主线唯一无关文件 main-after-PR36-latest.json 保留。

## Review Focus

- 高分辨率像素区间内存与历史上限，不因极端输入卡死。
- 第二触点、pointercancel、窗口失焦不能误提交绘制。
- 恢复缺失/非法 edit metadata 不可退化发布原始模型方块。
- 串行区域任务审批/部分成功/取消与恢复不能重复付费。
- 删除/撤销色块后 @ 引用需阻断失效指令，而非错连同色区域。

## Task 1：Mask 与裁剪/融合领域

Files：src/features/image-edit/{mask,regions,prompt,pixels}.ts；tests/unit/imageEdit.test.ts。

Interfaces：MaskDocument/MaskRegion；planEditRegions(document): Crop[]；qualityForSide；blendMaskedPixels(original,generated,mask)。

- [x] 先写失败测试：边界/重叠链/3与4/阈值/像素保护/色块编号和歧义。
- [x] node --test tests/unit/imageEdit.test.ts 观察 RED。
- [x] 实现统一 runs、区域算法、内部羽化、结构化 prompt。
- [x] 定向及全套单测 GREEN，提交。

## Task 2：任务快照与模型适配

Files：image-edit/{imageProcessing,editTasks}.ts；creation/{model,imageTaskCommand,imageGeneration,nativeTaskHost}.ts；App.tsx；src-tauri/src/task_host.rs；projectPackage.ts。

Interfaces：ImageEditSnapshot 保存原图/Mask/crop/group；prepareEditTasks 产生 CreateProjectInput[]；composeEditResult(task,source,siblings)。

- [x] 失败测试覆盖 task快照恢复、能力/尺寸、mask传输、导出引用、迟到与部分失败。
- [x] 实现原件裁剪/边界延展/标注图、原生mask优先、共享合成；多区域复用任务且串行调度。
- [x] 定向/全套 Node、Rust门禁与类型检查 GREEN，提交。

## Task 3：编辑交互和灯箱

Files：image-edit/{ImageEditor,EditToolbar,EditComposer,ImageLightbox,useImageViewport}.tsx；ImageRedrawDialog、ImageCreationNode、DemoMediaPreview、DemoResultNode；image-edit.css；tests/browser/image-edit.spec.ts。

Interfaces：ImageEditor(document,onChange,onSubmit)；现有 command context 提供当前项目候选与操作。

- [x] 浏览器先观察原功能缺失；真实上传/绘制/撤销/缩放/双指/请求像素/候选回归。
- [x] 按既有 gallery/Modal/ComposerTextarea/token 实现，键盘/IME/移动安全区共用。
- [x] 定向 Web/生产构建/完整 verify；分别取运行证据，提交。

## Task 4：验证、独立审查与交付

- [x] 同步功能卡/registry/任务账本/PROGRESS/PROJECT_STATE/HANDOFF，版本 bump Desktop/Web。
- [x] npm run verify、client:check、Rust tests和可执行原生验证；明确真实模型/真机边界。
- [x] 绑定 base 78cea37 / 源码 head dbc88bb 的独立只读 reviewer，IM-001–009 全部 CLOSED；保留本地可审阅提交，不自动合并发布。最终文档提交另做精确 head 补审，见 review。

## 开工与恢复记录

原生 worktree 工具因聊天 cwd 是容器目录返回 Not a git repository；按已声明仓库偏好用 git worktree fallback。独立 npm ci，Node24。fetch 的失效本机代理以单次 git -c http.proxy= fetch 成功，未修改代理配置。基线检查运行记录在 verification。

首次实现提交 ba8806d25ccb35020e2a9dce6baaa1fe4dded57c 后，主线前移至 78cea37af9359fd2d9f58f2854525516deee8a06（PR #37）。在本任务分支合并该主线，保留 HTTP/响应流/下载取消、unknown 重试边界和双方历史记录；本任务 Mask multipart 与可选元数据 helper 同时保留。组合版本递增为 Desktop 2.1.8 / Web 2.1.9，Mobile 规划 2.1.1。组合回归及正式 review 以 verification 新记录为准；没有合并本任务到 main。
