# 前端标准与示范素材来源

- UI 权威：Figma 文件 `0nU0A7pq6eyjwfwm1TtWkO`。沿用当天已读取的 `170:8490` 视频模块、`170:8853` 视频参数、`100:16335` 导航、`89:15928` 数量选择上下文及 PNG，具体缓存在 `../navigation-fix-2026-09-07/`；动效/原型证据见该目录 `prototype-actions.json` 和 `../replan-2026-09-07/INDEX.md`。
- 本批新增跟随加号、连接删除/撤销、示范结果与媒体预览是用户明确授权的前端补充。复用原稿中性表面和文字令牌，140/220ms 动效为工程补充，不称作来自原稿关键帧。
- 最近一次设计读取 `get_design_context(100:16335)` 返回需要重新认证；原始工具结果完整保存在 `../navigation-review-2026-09-07/design-context.json`。同节点 motion 调用成功返回空节点，不能把两种工具结果合并成全面不可用。此后没有条件变化，未重复认证失败调用。
- 用户允许参考 [Iconsax](https://iconsax.io/)。本批代码使用固定版本社区 [iconsax-react](https://github.com/rendinjast/iconsax-react) 0.0.8 的 Linear 图标，npm 许可元数据为 MIT、包完整性值已保存到 `iconsax-package.json` 与根 package-lock；包内未找到单独 LICENSE 文件。不将该社区包元数据解读为 iconsax.io 当前所有付费素材授权。既有 Figma 导出优先保留。
- 示范图片：本任务内置图像生成工具创建蓝调海滨城市图，复制到 `public/demo/blue-hour.png`，原始生成文件保留在用户 `.codex/generated_images/01a07a76-66cc-70a3-b278-5ae77a217681/exec-8e30caef-1634-455f-8e02-ceec78d0238d.png`。
- 视频：基于上述图片在浏览器 Canvas 中生成 6 秒 640×360 VP8/WebM 镜头推进，使用 MediaRecorder；不是 AI 视频供应商结果。音频：8 秒原创合成 WAV（22050Hz 单声道）；文案：本批测试文案。生成脚本与实际媒体字节统计见 `../../evidence/frontend-standards-2026-09-07/create-demo-media.cjs`、`media-generation.log`，清单 `public/demo/manifest.json` 由 Zod 在前端校验。
- 所有示范均由用户显式加入画布，标注“示范素材”，不代表后端已接入。素材保持本地文件，页面卡片/收藏/编辑只在当前页面会话保留；未加入自动持久化或 Service Worker 离线缓存。
