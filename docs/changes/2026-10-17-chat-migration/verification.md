# Verification：旧聊天迁移与恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；IN_PROGRESS / NOT_VERIFIED。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。
- 用户资料已保全并独立逐文件核验；原始主快照SHA `998e0101cfd0d13ed660771f04a6668a618a0c6ae9ccf198088ab17e9e616931`，原backup SHA `9f5995365be5fd40e8353e449a1e94ed9ed7577496ffc93cf00b9b57667c5f5f`，身份SHA `8db3d8823cb8c4ecfc92458d0ea41ffaa5ba8acf491dd0ffb9f7edd63c2482c0`。
- 完整2491文件259972032B保全receipt SHA `d01f4fe869c98abafeed22c2579ac556b581fe07f0925f0a1502f23819e5c81e`；独立2491文件0 mismatch receipt SHA `071cc099e2d14594d3f4bc8d896a9dbb49e40bc1c3d1bb47e35f9ddd98e4f834`；路径见[计划](plan.md)。
- 候选Desktop/Web2.1.37，Mobile规划2.1.1，官方版本递增与version:check通过。Native副本及默认资料迁移、编辑聊天实际验收、完整冻结verify、最终独审和Delivery未完成，不沿用前次审计PASS。
- 三项限定独审问题SMR01/02/03均先保留真实RED：raw3含独立root正文被投影覆盖、空库坏journal提前发布marker、未知version 4.0/string/-1/null被当坏文件覆盖。修复后TS存储160/160、Node服务69/69、Rust226/226+integration41/41（1既有硬件ignore）通过；全量Rust日志`.tmp/chat-migration-20261017/cargo-full-after-review.log`。Node四入站拒绝模糊raw3并保留主备原字节。限定dirty复审receipt SHA `4158f94f7518e302dc06d17f2b0f57aca66356ab49649be93617f7102c750906`，并非最终HEAD批准。
- 首轮verify在新增server-only模块未登记时失败；已登记精确文件并保留浏览器禁止导入测试。第二轮npmtest遇旧作用域fixture错误，两项等待进入发送的测试永久不达，root核对父子PID/命令行后仅终止这两个测试子进程，日志保留；该轮1877项报告1846PASS/17FAIL/14既有SKIP，未执行后续Agent/UI阶段。正在修正被新契约替代的fixture及检查真实回归，不能报告全量通过。
- 外部真实服务、费用、Hosted、发布和用户产品验收分别记录；当前无新增成功证据。
