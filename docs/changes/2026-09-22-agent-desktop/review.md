# 独立增量预检

审查者：独立子代理 verify_prior_claims，只读。范围以本轮baseline-manifest界定，未将旧dirty工作混入。最终结论：指定Desktop Agent代码/产物预检PASS，未发现未关闭P1/P2；不是正式PR审批。

- DA-R1 同数据根双实例写同一配置：独占文件句柄修复；正常停止先关闭Job并等待旧进程退出，再释放数据目录锁。Rust独占/释放回归通过。
- DA-R2 外部连接握手可被本机启动抢占：connecting禁用、执行guard及await后的revision/状态/endpoint复核。独立SSR反例disabled=true，慢握手浏览器回归通过。
- Token无env保存问题：完整调用锚点修复安装脚本；独立内存fs反例确认不保存合成Token，实际桌面配置也为空。
- 依赖复制：136包/210依赖边，物理位置相符；实际EXE旁运行包4,269/4,269哈希匹配，并与当前Agent编译产物/desktop entry零漂移。
- 历史兼容、空线程持久化、恢复状态、主进程退出、第三方服务保留：独立回读真实8项与空会话7项验收；专项26/26单测通过。

审查回读时全量verify曾被外部1423占用阻断，因此审查没有把旧结果替填为新成功；后续该端口自然释放后的270项浏览器回归见verification.md。回传后原工程完整门禁与保留证据记录在integration.json。

基线清单SHA-256：6cd4b761602cd16f2b1e94601338dca79c7bf097b15417ac83dfdc771b05b153。最终18核心文件审查清单摘要：8d7652fa419fb42ec5a0bc545c0e04458415dfd3939e3b733f86c5295bc527b7。运行包manifest SHA-256：35f7565b9536b700e69d2b2cac9c39043ff6d3fa77d752f2dd7cf27b020bec78。

## 原工程组合版本最终收口（2026-09-23）

同一独立审查者再次只读复核：原先1423端口门禁已解除，完整verify日志356 Node/286 browser通过并与integration.json记录的日志哈希一致。18核心文件聚合指纹未变；当前integrated-source-manifest中522文件零漂移。原工程最新EXE 4b8f8a047b4a444935fe4a1245c8056afcdcbe99922d00c4608385c964aef63e与真实8项/空会话7项报告匹配，实际JS/CSS对应当前dist，EXE旁4,269个运行文件重新核算全部相符。

最终结论PASS，无新增可操作P1/P2。保留并行UI之后2,062文件的比较边界、TASK-AGENT-002整体PARTIAL及正式发布未验收的声明均准确。此结论仍限Desktop Agent独立增量预检，不是正式PR审批。本次补审未修改源码、重跑测试或启动服务。
