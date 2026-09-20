# Spec

- ID：T4；状态源为 docs/governance/task-ledger.json。
- 入口：首页、项目对话、画布图片 composer、图片结果继续编辑、上传图片重绘统一调用 App.submitImageCommand → prepareImageTask / appendImageTask → executeTask → generateImages。
- 协议：现有 OpenAI-compatible `/images/generations` 与 multipart `/images/edits`；不推断其他 Provider 原生协议可用，不接通未实现的 ComfyUI 或平台额度。
- 请求：prompt（最多 4000 字，与持久契约一致）、model、count、privacy、固定 connection/credentialRef、archived attachments、可选 sourceItemId。项目不自动切换账号；异步读取后复核来源及参考图、项目和连接。
- 引用：从 Asset Repository 读取归档原件，自身编辑原件与 incoming reference edges 去重；result edge 不消耗参考槽位。缺原件、非图片和不支持格式必须拒绝，不能退化为文生图。
- 数据：sourceItemId 为历史兼容的可选任务字段，同步浏览器 normalizer、原生 snapshot 与项目包严格 schema；来源后来被删除不会丢弃已归档结果。
- 状态：排队/运行/部分/成功/失败/离线/取消属于同一 task；结果连接到触发节点。新结果只发布一次，不因后续分块状态刷新恢复用户删掉的结果。取消审批清理来源 pending；恢复只标记实际中断来源。
- 健康：active 表示配置可提交，verified 只由成功图片响应更新；`/models` 探测和保存本身不验证生成。模型/地址/凭据变化撤销旧验证，不重置冷却和隔离。
- 验收：mock HTTP 证明产品请求及归档路径；Web dev、production preview 与 Tauri release 独立验证，Desktop 全新 WebView 仍恢复来源/结果/连线/原件。真实第三方响应属于 EXT-PROVIDER，不能以 mock 代替。
