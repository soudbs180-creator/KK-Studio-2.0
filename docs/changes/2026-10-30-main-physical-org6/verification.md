# 实际结果

## 真实 H3 首次运行与缺陷复现

用户确认仅已有视频权重后，使用独立验收 venv（CUDA Torch 2.14.1+cu130，pip check 通过），未修改 Hub 原 venv、权重或原工作流。实际 ComfyUI 0.34.1 / RTX 5080 成功运行 H3：首轮 prompt 8961955b-439e-4ef0-a52c-d87d4a333afa 输出 MP4/PNG、日志 41.54 秒；再次通过正式 2.1.58 客户端 UI 导入、建卡、进入真实 iframe/返回、快速生成，prompt edd94f83-4caa-4ff4-979e-edd956ac5d73 的 history 为 success/completed，耗时约 70 秒。原件位于外部证据目录的 comfy-output/kk-physical-20261030；这两次均非仿真。

2.1.58 的真实回流未通过：SaveVideo 的 images 含 MP4，数字节点 92 会被 JS 先枚举，图片读取因 MIME 拒绝使后续首帧归档中断。原断言等候 180 秒失败，日志、history、未完成快照保留，不把 GPU 生成成功当资产/画布成功。新增混合输出回归真实红（MP4/GIF 被解析）后最小修复绿（13/13），危险路径仍拒绝；早先一次错误测试命令缺少 tsx 的失败另存，不计作行为 RED。2.1.59 当前源码待完整快速门、独审、正式重建及物理复测。

本轮初始状态（已由下文新增回执更新）：PARTIAL。新备份21文件，main与其原件未改；默认及renormalize只读merge-tree均68冲突路径。RTX5080显存16303MiB、驱动610.88实际查询；当时仅有用户提供的Comfy路径、尚未真实执行。原CI首建基线3项失败不是已通过。

日志、备份、逐包manifest/恢复和准确指标归容器output/main-physical-org6-2026-10-30。ORG6/真实出图/合流分别补证，历史2405单测与旧截图不能代替本轮验收。

## ORG-6 本批实际完成（任务树候选）

本批1200文件，毛迁出160288854字节；60包manifest，22份历史Markdown的87个目的地调整。跟踪工作树内容253778435→94367642字节，含清单/说明开销后净减159410793字节（62.8149%）。没有改写Git历史，.git历史体积不因此缩小；主线尚未减量。此前62份试点单列，不把1292旧副本数量说成全部已迁出。

当前源/Git blob/容器原件逐份匹配，1200份恢复到全新org6-restore目录并重算SHA/大小全部通过；所有新/更新清单复用现有version1校验器，在显式容器模式校验。66张E1关键图联系表六页逐页复核并逐字节保留，30份活跃/改变引用源保守保留，原MD/验收JSON/当前资料保留。历史断链86→86、无新增断链；原图片嵌入改同文字的清单链接，历史失败/结论/数字不变。布局基线只移除490个已迁出路径条目，578→88，不新增豁免/改来源。

首次迁移预执行在历史archive文档引用处停止，尚无仓内写入；修正历史文档范围包含archive后执行通过，两个原日志保留（org6-migrate.log与org6-migrate-v2.log）。恢复/副本/路径guard未放宽。根typecheck0、增量lint0（basebe730617）、全单元2405通过/20跳过/0失败；产品源码和版本未改，最终文档/清单审查、当前SHA与main合流另记。默认首建基线/远端冲突/全套运行门保持开放。

## 2.1.59 真实 H3 双路径回流通过

固定源码 d6d592e41235f53201d7efdf72345dfe8d901ca0；正式 ensureDesktopRelease 默认构建器重新构建，输入指纹 40d0f1788f9ab5dae8ce0a86295b2929f4f553331e5655200ee3727708127c39，EXE SHA-256 6d001f979c156a2bb81acd3f6aedf9fbcd1b55a588afdb8e7f526260c97551ed，Desktop/Web 2.1.59、Mobile 2.1.43。根类型 0、增量 lint 0（base 9a23709a）、全单元 2406 pass/20 skip/0 fail、相关两文件 Prettier 通过；独立只读补审 9a23709a→d6d592e4 PASS，额外内存 session 混合输出验证通过。

通过真实 Tauri WebView 的 CDP（无桌面鼠标控制）操作隔离数据/profile：UI 导入 16 节点真实 H3 API 工作流、建工作流卡、进入完整原生 ComfyUI/返回、点击快速生成；host prompt e146e67b-193f-4ae4-9b66-85a4ff5c6b69 实际 CUDA 执行。再经官方 Comfy app.loadApiJson 加载同一 H3 图、种子改为 20261031，以原生“运行”按钮键盘 Enter 提交 editor prompt 1ca92f96-393b-4706-bdcc-8c0a24158a65。原生 iframe 的默认初始图并非所选卡片 API 图，本次明确手动加载 H3；没有宣称卡片与编辑图自动同步。

两条 history 均 success/completed，client_id 分别严格属于同卡的 -host/-editor。两段 MP4 全帧解码各 512×512/124 帧/24 fps/约 5.166688 秒，音轨各解码 162 帧。首帧分别经现有 AssetPort 写入、画布图片节点和 result 边；与 Comfy 原件 SHA 逐字节相同（host 0f2888b5d4a60b01da555bf4ad73a47adc968c2681a03462a9553069250c0629，editor a7626b97d1e4d59904123f8dcecd206e54898b3f0e9f3746f1c23fd19e7d39b3）。重新加载并从项目库打开，两个节点/结果边持久保留，截图已逐张视觉核验。

工程外原件：output/main-physical-org6-2026-10-30/physical-final-artifact-receipt.json 记录 MP4、history、快照和关键截图 SHA/大小；physical6-complete.exit 为 0，physical6-editor-receipt.json / physical6-receipt.json 分别记录两条路径、进程与正式构建身份。失败的 physical2 回流、physical3/5 自动化启动/iframe 附着时序日志保留，后者修正 runner 等待而未修改产品；physical4 首次完整 host 通过也单独保留。Comfy 的 Windows 断连 WinError 10054 日志仍存在，未隐去；真实完成、归档和持久化断言均通过。

REAL 仅指本次 H3 视频与首帧图片回流。Comfy 使用任务拥有的隔离运行环境、用户原模型及独立产物目录，服务由验收 runner 启动；Hub 容器根目录自动发现/安装/启动未验，不能称已点击“选择目录”完成托管启动。没有下载图片 checkpoint；常规图片模型、P6 各图像能力、视频 AssetPort/视频画布节点、已安装正式客户端、物理鼠标、全套浏览器与 main 合流仍未通过。本任务启动的客户端/服务已退出，未停止其他程序。

## 真实H3验收准备

用户确认仅下载视频模型，改先验真实视频链路；图片模型及图片出图保持未验，不因视频成功就自动升级。安装位置为用户Hub目录，已有四个H3视频工作流与对应模型文件。现有Hub venv缺torch；任务独占临时venv按现有ComfyUI requirements安装运行依赖，不改Hub环境或权重。CUDA版本/实际执行、产物和软件落点以随后回执为准，不以安装成功充当生成。
