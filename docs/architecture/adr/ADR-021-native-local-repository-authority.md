# ADR-021：Native 作为本机完整仓库的唯一写入权威

- 状态：ACCEPTED（分阶段实现，未发布）
- 日期 / Task ID / Owner：2026-10-15 / TASK-KK-UNIFIED-20261015、TASK-LOCAL-SERVICE-001 / root
- Intent / Spec / Plan：[批准规格](../../changes/2026-10-15-kk-unified/spec.md)、[实施计划](../../changes/2026-10-15-kk-unified/plan.md)
- 授权依据：用户要求 Desktop/Web 共用完整项目、聊天、画布、素材与原件；重复启动不新增窗口，关闭窗口后仍可按需提供本地服务。
- 延续：[ADR-019](ADR-019-unified-local-repository-and-optional-account.md)、[ADR-020](ADR-020-project-lifecycle-in-creation-snapshot.md)。不改变可选账号、手动同步与本地原件边界。

## 问题与备选

现有 Native 素材记录有封装，Node companion 为裸metadata；直接将旧 Node 服务指到 Native 目录会误读。两端各自持有项目副本也无法保证 CAS、任务归档及原件引用一致。

采用现有 Native snapshot/assets 仓库作为唯一磁盘权威，Tauri IPC 与后续 loopback HTTP 使用同一 Arc 对象；保留 Node companion 为显式导入源。拒绝再建第二套仓库、队列或 Node→Native stdio 宿主。旧独立仓库构造器保留，用于隔离暂存、既有测试和兼容调用。

## 身份、启动和锁

- 按真实规范目录选举权威，根目录别名收敛到同一身份；不同真实数据根可独立运行。仅受控 app/projects/assets 等子目录拒绝重解析路径与越界，不扫描或限制用户整台电脑及模型目录。
- `app/repository.json` 记录有界、严格校验的 version/repositoryId/formatVersion/minWriterVersion；身份与 epoch 使用系统随机源，不从时间、PID、邮箱或路径推导。
- 生命周期持有 root guard 和已知 legacy snapshot/assets/TaskHost journal 的实际 OS 锁，先全部取得并完成格式准入，再创建 TaskHost 与 AgentRuntime。部分取得失败释放已有句柄，不先执行 submitted→unknown 恢复。
- 同一权威对象使用明确 Owned 事务入口，独立调用维持 Standalone 的锁语义；不采用全局 bypass、重入猜测或另一套队列。项目包和 TaskHost 复用同一素材/快照对象。
- 重复启动只对已验证的 repositoryId/epoch 发有界激活请求；未就绪、陈旧描述、握手失败或身份不符时失败关闭，不自动另建同名数据根或执行任务恢复。
- 未知 marker、未来主/备份格式、Node 裸metadata 拒绝写入。有效 Native 记录对应原件丢失与格式不兼容分开：不因缺件重新建库、删除记录或改变身份；读取缺件沿用明确 missing 状态，后续找回入口负责修复。

## 本阶段激活传输

使用成熟 Axum 0.8.9，复用 Tokio/Hyper/Tower 与 reqwest；不手写 HTTP parser。该版本最低 Rust 1.80，因此同步提高原声明 1.77，不能声称仍兼容 1.77。只增加所需直接依赖及锁定传递项，不升级其他包。

当前阶段仅在 loopback 随机空闲端口提供非秘密 health 与 Native-only activation，描述文件只含端口、公共身份、epoch 和协议/格式版本。校验 Host、peer、method/path、body 上限与事务身份，拒绝 Origin/Sec-Fetch 的网页激活；不接收任意路径、shell、凭据或启动参数。描述不是授权令牌，不能当作网页目录访问授权。

这不是 Web 完整仓库接口。后续 HTTP 数据面必须调用现有原生读/CAS写/素材操作并复用返回回执，阻塞文件 IO 进入现有 spawn_blocking 边界。不得以新激活端口代表 Web 共仓库、后台租约或账号登录已完成。

## 后续授权和生命周期边界

网页访问需独立目录/设备授权、固定 origin、短期会话与撤销；登录不扩大本机权限。托管 HTTPS→loopback 的本地网络权限与认证分开测试。现有 Strict cookie 无法证明跨站登录可用，不能用长期明文 localStorage token 替代；记住设备的协议与浏览器兼容另行实现和验收。

当前关闭窗口/真正退出行为先保留；后续增加窗口、Web lease 和运行任务引用计数，最后使用者退出后才结束必要服务。文件菜单显式新窗口、临时聊天、编辑命令以及新窗口独立草稿仍需产品层接线。新 schema 迁移须先完成写入准入，发布新格式主文件与备份及不可变旧格式归档，不能靠版本号绕过旧写入者。

## 故障、回滚和验收

选举/锁/格式失败不更改旧快照、原件、任务状态或另建根；进程崩溃由 OS 释放锁，陈旧端点不能获激活成功。marker 发布失败不得继续恢复任务。当前已知 legacy 锁域可互斥，不推断任意历史或第三方无锁写入者都受保护。

需要真实跨进程争用/崩溃释放、目录别名与不同根、部分锁失败、原件缺失身份保留、未知主/备份字节保留、同权威 CAS/素材/任务归档不死锁及重复启动先于任务恢复测试。Native GUI 聚焦、全新产物、关闭窗口后网页继续读写、实际托管浏览器授权属于后续实际验收；单元测试或本阶段 health 不能代填。

回退只针对未发布候选代码，不删除身份/记录/原件或覆盖用户仓库。新的 format/minWriterVersion 未获旧版本支持时，不自动降级格式；数据恢复通过显式验证的暂存/导入流程完成。
