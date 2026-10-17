# Verification：旧聊天迁移与恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；IN_PROGRESS / NOT_VERIFIED。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。
- 用户资料已保全并独立逐文件核验；原始主快照SHA `998e0101cfd0d13ed660771f04a6668a618a0c6ae9ccf198088ab17e9e616931`，原backup SHA `9f5995365be5fd40e8353e449a1e94ed9ed7577496ffc93cf00b9b57667c5f5f`，身份SHA `8db3d8823cb8c4ecfc92458d0ea41ffaa5ba8acf491dd0ffb9f7edd63c2482c0`。
- 完整2491文件259972032B保全receipt SHA `d01f4fe869c98abafeed22c2579ac556b581fe07f0925f0a1502f23819e5c81e`；独立2491文件0 mismatch receipt SHA `071cc099e2d14594d3f4bc8d896a9dbb49e40bc1c3d1bb47e35f9ddd98e4f834`；路径见[计划](plan.md)。
- 候选Desktop/Web2.1.37，Mobile规划2.1.1，官方版本递增与version:check通过。Native副本及默认资料迁移、编辑聊天实际验收、完整冻结verify、最终独审和Delivery未完成，不沿用前次审计PASS。
- 三项限定独审问题SMR01/02/03均先保留真实RED：raw3含独立root正文被投影覆盖、空库坏journal提前发布marker、未知version 4.0/string/-1/null被当坏文件覆盖。修复后TS存储160/160、Node服务69/69、Rust226/226+integration41/41（1既有硬件ignore）通过；全量Rust日志`.tmp/chat-migration-20261017/cargo-full-after-review.log`。Node四入站拒绝模糊raw3并保留主备原字节。限定dirty复审receipt SHA `4158f94f7518e302dc06d17f2b0f57aca66356ab49649be93617f7102c750906`，并非最终HEAD批准。
- 首轮verify在新增server-only模块未登记时失败；已登记精确文件并保留浏览器禁止导入测试。第二轮npmtest遇旧作用域fixture错误，两项等待进入发送的测试永久不达，root核对父子PID/命令行后仅终止这两个测试子进程，日志保留；该轮1877项报告1846PASS/17FAIL/14既有SKIP，未执行后续Agent/UI阶段。正在修正被新契约替代的fixture及检查真实回归，不能报告全量通过。
- 外部真实服务、费用、Hosted、发布和用户产品验收分别记录；当前无新增成功证据。

## 第一冻结候选e2482a21（未验收）

本地提交e2482a21（103文件）保存实现与阶段文档，未推送/合并。第三轮verify的lint/typecheck、Node1886=1872PASS/14既有SKIP、Agent204=202PASS/2既有SKIP、UI/format和生产build均通过；进入824项Edge后发现共享helper先建立v3/marker2再回写v2弱副本，正确触发只读屏障，导致批量编辑断言失败。新聊天case在compact还缺显式展开面板。root核对精确runner PID48172/parent59732后仅中止该测试进程树，原日志`.tmp/chat-migration-20261017/full-verify-source-3.log`及run06795ffa全部失败/重试/截图保留；这是INTERRUPTED/FAIL，不是完整browser通过，DESIGN/development未运行。不关闭保护或清空IDB绕过，正在按canonical3修正共享夹具后重新验证。

e248正式双轴独审另确认三P1，见[审查](review.md)，分别为远端瘦历史覆盖本地媒体元数据、同chat运行中重连epoch无法审批中断、直接发送迟到清理跨chat草稿。修复和新head复核未完成，默认资料未迁移。

真实备份的纯TS迁移预览另保留在工程外`pure-preview-59b625d2-2394-493e-8e6e-585a274b8d00`：9项目、2原chat与5旧root线程逐项保留，形成11个独立上下文；原输入对象不变，JSON持久化decode/serialize一致、再次迁移幂等，候选SHA4b75f17a61f948591dfe1ac41bc991944f9896066e31e39ef43c33774997359b。首个探针错误地把459个仅内存undefined新增属性算作wire差异，原失败log保留；独立结构对账确认0原字段删除/0值改变，以实际JSON wire比较后通过。此为纯生产TS处理备份字节，尚不代表Native或默认资料迁移通过。

补充保全：只按快照中5个精确旧thread ID读取对应session文件名与只读SQLite索引，未扫描其他会话正文、未写SQLite；5个原rollout/4051009B全部复制重哈希保全，工程外`legacy-codex-originals-34cefb37-9629-42d7-bf47-f40cfa67de0f` receipt SHA bb0127cba8a5d5d92350e18b2d604cef0483c47c53bca8f16fbd1b3ac79f1d8e。首轮Windows扩展路径前缀校验导致索引预检FAIL（5原文件已复制），归一化同一合法绝对路径后fresh目录重新验证PASS；原失败和文件全部保留。

官方Agent生产运行时已在fresh production npm安装和fresh candidate完成打包，未调用会旋转目录的publish；旧EXE/receipt与两份原runtime共8564文件先复制重哈希到工程外`native-before-build-e2d40ef7-4120-4ff4-9d2c-e381f16d482d`，当前candidate4282文件逐一校验并原位复制（无删除/移动）。此包绑定e248，后续runtime修复会使其过期，必须重打包和正式Native重建。尚未构建或启动新Native，旧默认原主/备/身份三SHA仍保持，原主仓63dirty/index完整性a7d7f99d收据PASS（SHA5afa914de193fec6070983f0d05c3a5bc5a7aa6a551b5b6e13a4264bb30b2efe）。
