# 页面对齐契约

1. 颜色和基础组件沿用DESIGN-SYSTEM 1.1；保留8个品牌底色、页面网格/信息结构、已确认Landing/Workspace专项几何。
2. 目录页标题display24/30、分节title16/22、正文12/16；普通输入32/r10/bg-input/必要边界；真正的多行文本保留行数与滚动。目录页卡片bg-card/r28；模态面板r20；筛选按钮pill，并暴露aria-pressed；图标按钮32/r10。
3. 复用现有CSS/原生input/Modal/UiIcon；普通与危险操作不受局部旧CSS覆盖。Skill编辑器字段要清晰可辨，动态名称/URL/说明可换行，390px不遮挡操作和保存/取消。
4. 检查真实目录/设置消费者，而非只检查变量存在。双主题×8色，对比度、focus/selected/hover和必要边界满足1.1契约；原有搜索/筛选/创建/保存/取消/Escape回焦保持。
5. Web先重建dist、固定1423 preview；Tauri需新build、隔离--data-dir与WebView profile、验证实际tauri.localhost与资源包及重启偏好。Web截图不能替代Desktop。
6. 返回主工程前与初始快照核对，只合本任务增量。完整verify和独立只读review后更新账本与剩余事项。缺失页面Frame只能判规范一致，不能声称逐像素Figma验收。

桌面截图追加发现：侧栏archive/skill/workflow单色图标在浅色底上的对比度1.398，Logo为1.0。保留SVG源文件和几何，仅修正这一组浅色前景；实际浏览器绘制像素回归需达到3:1。目录模板区与筛选区使用space5间距。
