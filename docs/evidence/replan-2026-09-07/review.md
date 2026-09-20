# 重新规划核查记录 · 2026-09-07

范围：延续 UI 纠偏；本轮未启动后端、未写 Plate、未清理旧代码/用户数据、未发布。

## 中断诊断

前一任务 01a07746-c084-7811-b28e-94ab5da0b833 的最近四轮错误依次包含两次 workspace out of credits、两次 remote compact 网络流中断。错误来源是 Codex read_thread 返回，不据此判断账户当前仍无额度。

本轮 Figma 先返回需 reauthentication；用户说明已连接后再读成功。253:563 为 2×2 圆点，已通过 Page 1 元数据追到视频模块。三个具体组件的上下文、图片和 motion 响应已持久化。无需用户再次登录。

## 本轮增量

- Prettier 修正 TopBar.tsx、interaction.css、ui-motion.spec.ts 的格式，语义不变。
- frontend.spec.ts 的旧鼠标起点落到 sidebar。诊断值：节点 x=274、y=173；x+8=282，DOM target=sidebar，insideNode=false。根因是视频选中后的自动平移改变可见区域；修改测试从可见图片预览中心拖动，额外检查 elementFromPoint 命中。
- 复用并检查中断任务遗留的搜索收藏、视频编辑、真实任务空态、整理和小地图等实现；不归为本轮新增功能。
- 保存新的分阶段计划、来源索引和进度；创建自动化 kk-studio-ui，等待应用执行后续定时触发。

## 验证

- 初次 verify：类型与12核心测试通过，格式检查失败于3文件，构建与浏览器未在该次命令执行。
- 格式修正后完整 verify：[verify.log](verify.log)，32项浏览器通过、1项旧拖动测试失败。完整失败报告 [baseline-browser-results.json](baseline-browser-results.json)。
- 单项定位：加入临时 DOM 命中诊断后重现 sidebar；临时日志已去掉。修正后的聚焦回归 [drag-regression.log](drag-regression.log) 退出0。
- 最终完整 verify：[verify-final.log](verify-final.log)，退出0，12核心测试、33 Edge 浏览器测试通过，0失败、0跳过，类型、格式和构建通过。报告另存 [final-browser-results.json](final-browser-results.json)。构建 JS gzip 94.46 KB。
- 视觉实际查看了主画布1920和收藏弹窗实现截图，并读取视频、收藏、导航的 Figma 原图；尚未完成所有状态逐像素比对。已有减少动态效果用例通过，不代表动效时序与原稿一致。

## 8步自审

1. 完整性：重规划、来源恢复、当前基线验证、续跑配置和交接文件均落实；业务UI还原仍在进行。
2. 正确性：根据真实 DOM 命中修正测试，不放宽位移/连线断言；节点锚点由实时元数据确认。
3. 健壮性：保存旧失败报告和最终报告；当前恢复入口不依赖会话最终回答成功。
4. 结构：沿用现有组件与栈，没有批量重构或重复建状态源；计划和来源分开，进度只用 PROGRESS。
5. 性能：仅采用本次构建测量；没有千节点性能或帧时间证据。
6. 安全：没有读取/存储用户密钥，没有外部发送、后台服务扩展或破坏性操作。
7. 验证证据：退出码与报告已核对；不将自动化创建等同于首次调度成功，不将工具读取等同于设计验收。
8. 更好方案：以小节点读取、单交付闭环和及时落盘代替重复整页读取与长会话依赖；发现原稿差异后排入下一步，不继续锁定旧布局。

