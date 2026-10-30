# Plan：普通 Chat 图片归档

- Task ID：TASK-CHATGPT-IMAGE-POC-20261018；状态 PARTIAL（默认Native已有原件归档/重放/重开通过；正式适配已实现，新实际任务导航Unknown，完整链与扣额未验）；2026-10-18。
- Base `e11b87a579a92f89d7d60f9c2f1be15bfb033065`；[intent](intent.md)、[spec](spec.md)。

1. 阅读规则、现有 bridge/repository/scope 和测试；核对 lock 后在新树建立只读依赖 junction，运行相关基线并保留退出码。
2. 后端限定 schema、HTTP 作用域、定向分派及日志脱敏；先观察失败测试，再实现。
3. 前端 bridge 增加 assets_add 路由，宿主复用仓库归档、持久画布幂等和 flush 后原件回读 receipt；先观察失败测试，再实现。
4. 同步平台版本、账本/相关功能与当前文档；运行类型、相关/全量单测、Agent 与前端构建和治理检查。
5. 独立审阅 dirty diff，修复后复验。保留真实配对、Native 运行/重开、外部图片归档、Hosted/提交/发布的未验证边界。

后端 vendor/canvas-agent 与前端 src/tests 可由不同写入者独占；版本与治理由 quota_gate 串行维护。1421/1423 未获独占前不启动浏览器套件，不影响正在运行产品。

## 实际文件面与必要变更

- vendor schemas/session/http/package test：严格输入、定向scope、旧epoch拒绝、日志脱敏与HTTP测试。
- agentImageArchive/agentHost/agentConnection：仓库、解码、原件回读和既有Agent传输接线，不发送Codex turn或查询图片API。
- creation/model：持久imageArchiveReceipts，保留真实job→SHA与删除tombstone，防止重启/删除后改绑或复活。
- creation/storage 与 App：新增只读持久快照回读hook，不能用现有loadCreationSnapshot，后者会改变CAS基线并可能恢复/迁移；本函数不改变writable/expectedRevision，不回退localStorage。
- 相关测试、版本镜像和最小治理同步。未重构存储或旧生成流程。
- 浏览器验证按用户指定交由root使用Google Chrome CUA；独立127.0.0.2:1423夹具只写该origin的测试IDB，不控制Native用户库。无Edge/Playwright UI控制。

## 追加阶段：无 Chrome 的通道选择与原生连接

上述 Chrome 夹具为历史阶段，不是后续运行入口。用户已授权继续实际接通，后续不启动 Chrome。

1. root 读取真实原生回执并将已有登录窗口置前；用户本人首次登录，程序自动读取页面状态。此步骤不要求状态码或截图。
2. quota_gate 在独占 agentConnection/单测和新 imageChannelRoute 中补发送准入、权威用量和安全选路；root 处理其余调用方兼容。
3. image_route 在三个新增 Rust/JS/tests 文件中实现自有 WebView 服务、任务持久化与原件回传；不改 main/Cargo/共享文件，不发真实生成。
4. root 接 main 受限命令、前端适配、偏好和现有图片入口/严格归档；只在来源与模式可确认时放行。未知字段不能伪装成功，普通 Chat 主路径不依赖 Codex quota。
5. 运行对应单测、Rust/类型/构建和候选审查。真实登录/DOM/原件条件成立后由 root 独占一次实际生成，逐项记录；未通过则保留 PROTOTYPE，不替换日常运行实例或发布。

## 续作：会话误判、隐藏连接与原件共用（2026-10-18）

用户继续授权实际修登录回跳/会话保持，并跑通普通Chat单图下载归档；补充本人首次登录后隐藏网页、KKAI点连接复用会话、素材同原件共享减少副本，以及研究BigPizzaV3/CodexPlusPlus最新改动。当前有效会话继续使用，不保证服务端永不失效。新实证：root只读r5自有窗口AX已见个人资料菜单、历史、Chat/Work、聊天输入框；旧探针false不能解释为未登录。live窗口/profile不重启，不读认证字段，不索取状态码/截图或重复验证。

本次工程决策：先以同配置/同UDF hidden about:blank sibling，用公开BrowserProcessId证明共享浏览器进程，再由root一次固定flag加载公开Chat页，只读结构投影验证实际选择器；不接任意URL/JS/路径、不读输入/正文/账号或cookie。基于实证修复连接/隐藏生命周期，再补一次发送与新回合原图下载关联，保留准入/原件SHA/持久回读边界。图片使用canonical SHA素材库；临时下载与运行时RAM搬运分开量测，不能宣称云端和本地共用文件或零内存复制。第三方仓库只读按SHA研究，不执行安装脚本或复制其授权会话。

## OpenCodex 与已有单图结果续查

固定 v2.88.0 / 6936d988 只读核查登录、图片转发、原件落盘和平台边界，结论见 [研究记录](opencodex-research.md)，不安装整套代理或改用户 Codex 配置。现有 r2 已持久记录一次发送点击，不重投；先检查同自有 UDF 当前唯一候选的固定测试文字与图片，再只操作已存在图片的预览/下载，原件与 Native 持久归档分别验收。不能用标题、尺寸、DOM 测试或代理代码替代实际额度归属证明。

## 本轮实际归档执行

1. 校验已下载PNG与默认库身份、现有项目及写入兼容，保留无关数据；当前没有KK进程。
2. 复用同一Cargo target和既有测试主窗口identifier，以固定1421 Native dev主运行时读取App实际装配的pluginLoader singleton/bridge；main-only本机测试端口不进入ChatGPT profile，不复制会话凭据。无产品IPC或硬编码原件路径的新seam。
3. 固定原导入身份，通过真实bridge.archiveImage并trusted transport:webview绑定当前scope，真实Native素材/画布flush与回读；不调用generate/submit/markArchived。
4. 重放同操作、重开、校验SHA/单blob/单节点及其他项目不变；只在canonical完整且回执持久后删除本次owned暂存，避免保留双份图片。
5. 查官方可见用量，不再生成；没有before/逐图账本不能以余额反推扣额。保持完整通道未验边界。

上述 1–4 已在默认 Native 用户库实际执行通过，下载暂存已校验后清理；用量观察器停止于 wrong_page，未获得用量或扣额证据。

## 继续接正式 Native 执行器

用户已持续授权继续实际接通。保留现有 TS status→submit/get/result→archiveImage→markArchived 尾链，仅补 Native 中已验证页面动作的任务绑定和状态推进：先预约 job/普通 Chat 首页准入，再验证草稿、提交前持久 burn、单次点击；只允许该任务的预期导航。当前 own-window 中精确提示词及唯一新图关联、同图预览与唯一下载门禁成立后，原生固定下载路径、字节校验及持久 Downloaded 才可推进。未知、重启、取消、旧回调不得自动重发或跨项目归档。成功后暂存清理需以持久 canonical 原件和画布回读为前提。

image_route 独占 Native webview/DOM/对应测试；root 串行集成其调用方、文档和运行验证。保留本次已归档外部 job 的真实来源，不能改写为正式任务或重发该图。先 RED/GREEN，再独审及单份构建；不复制 profile、不新增依赖、图片变体或额外付费 API。

本阶段后续：前两Blocked确定发送前失败，保留回执后才做一次新的显式工程调用。第三job2340fa4b已Unknown，禁止再次预留或重发；root保持一次性guard。严格草稿复用与导航Source时序反例已离线修复、独审、实际main26与重建通过，修后不拿旧Unknown伪造成功。只读SDK诊断在启动前发现原进程退出而未运行，不关闭另有release实例；实际新图闭环及服务端扣额继续开放。

## 本次续行：只恢复已有结果

1. 复核本机当前代码/日常Native身份及原3任务，保留原Unknown和guard；回答用户“归档”的本地原件/引用含义。
2. image_route独占工程外r6受限历史搜索probe，root独占真实窗口操作。先观察公共搜索结构，确定唯一目标及全文/图片，不猜标题、不遍历无关历史，不发模型消息或下载蓝球。
3. 基于观察接正式Native只读恢复入口与TS既有归档尾链；输入仅原TaskRequest，无任意URL/脚本/路径/外来bytes，原任务通过真实Native下载证据才可推进。
4. quota_gate独占工程外已有usage observer与官方来源核查；使用已验证的官方/settings/usage入口，在另一个owned窗口只读，不导航已有结果页或开启消费。
5. 完成RED/GREEN、独审和单target构建后，必要时在保存/无运行任务证据成立时正常重启当前实例；实际恢复同一Unknown任务，确认原图/来源/SHA、唯一素材/节点、重放/重开及暂存清理。无结果不重发、不回填成功。
6. 记录实际可得的扣额池/账本证据；没有逐图或before数据仍明确unknown。日常已由并发工具栏任务交付2.1.39，不能再用旧“未更新日常”代替当前身份；本任务每次写账本只改自己的对象。
