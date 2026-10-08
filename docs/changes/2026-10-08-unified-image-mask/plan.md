# 统一图片编辑蒙版 Implementation Plan

> 执行：superpowers:executing-plans，当前会话串行实现，完成后独立上下文复核。

**Goal:** 三个工具共用蒙版、发送和结果融合，原件安全且可连续编辑。

**Architecture:** 保留 App/CreationTask/TaskHost/归档边界；新增 image-edit 纯领域 Mask 和共享浏览器图像处理。每个独立区域复用一个 task，组内成功结果累计合成。

**Tech Stack:** 现有 React18/TypeScript/Vite/Tauri2/Canvas2D，无新依赖。

**Spec:** [spec.md](spec.md)；Task ID TASK-IMAGE-EDIT-001。

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
