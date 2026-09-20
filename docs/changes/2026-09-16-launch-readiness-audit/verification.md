# Verification

- ID：KK2-LAUNCH-AUDIT-20260916
- 结论：**Verified audit / Product not ready**。本轮完成代码、有限运行和VPS只读审计；未实现Blocker修复；未宣布真实Provider、ComfyUI或Mobile可用。
- 活动源码：master `609f5243e434494216a5e070b2bb2a4c4b7137dd` + 当前脏工作区。`git remote -v`空。源码SHA-256清单见`docs/evidence/launch-readiness-2026-09-16/source-fingerprints.json`。

## 本轮验证结果

| 命令 | 结果 | 边界 |
| --- | --- | --- |
| Node24 PATH下 `npm run verify` | 通过 | typecheck；91/91 Node单测；UI115文件0违规；format；build；130/130 Edge浏览器 |
| `npm run client:check` | 通过 | cargo check，不是桌面业务验收 |
| `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features` | 6/6 | 目录/旧数据保留/损坏会话，不包含完整creation write故障测试 |
| `node tmp/launch-readiness-20260916/browser-audit.mjs` | 复现两项缺陷 | 新的独立Edge context，未用真实Provider |
| 同脚本 `http://127.0.0.1:1423/` | 生产bundle同样复现 | 显示缺陷并非旧Vite缓存 |
| `node tmp/launch-readiness-20260916/recovery-audit.mjs` | 复现读失败后空快照写调用 | mock Tauri IPC，仅记录调用，不修改真实项目文件 |
| `node tmp/launch-readiness-20260916/contracts-audit.mjs` | 复现大data URL截断、过期cooldown不可调度 | 合约输入；非100MB真图/供应商实测 |
| release + WebView2 CDP | 入口核验成功 | `http://tauri.localhost/`，production，index-D11srnae.js；仅启动/DOM截图，不是完整原生CRUD/任务重启验收 |

主验证log：`docs/evidence/launch-readiness-2026-09-16/verify.log`、`client-check.log`、`rust-tests.log`（日志被现有gitignore忽略，留本机证据）。完整verify按项目既有测试更新了若干`docs/evidence`截图/JSON；不把这些原有脏变更自动纳入本次提交。

## 运行链路与同状态证据

| 环境 | 实际启动 | URL / route | 入口与证据 |
| --- | --- | --- | --- |
| Development | `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort` | 1421，`/`内active landing/comfyui/projects/workspace | `/src/main.tsx → App.tsx → StartPage / LibraryPage / Canvas`；browser-audit.json |
| Preview | `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`；verify先build | 1423，同上 | `/assets/index-D11srnae.js`；browser-audit-preview.json |
| Desktop release | `src-tauri/target/release/kk-studio.exe`，本轮独立WebView2 profile与9227调试端口 | `http://tauri.localhost/`，landing | production、runtimeEntry=src/main.tsx、1920×1080 CSS、DPR1.5；desktop-runtime.json / desktop-release.png |

Desktop独立WebView profile只隔离WebView数据，不改变Rust通过Windows已知目录定位的默认AppData。此次未在真实Desktop执行创建/修改/删除项目、配置密钥或生成任务；启动仍会按现有应用逻辑读取/保存默认数据。不能把这次启动截图称为隔离的原生存储恢复测试。后续需正式可注入数据根目录的测试宿主。

本轮未改UI，未重新读取Figma design context，没有声称重新验收像素一致。浏览器截图用于确认真实入口、边界与缺陷，和本轮代码分析对应。

## 新发现的可复现缺陷

1. 浏览器项目库新建空项目；选中image，按8次ArrowRight，left从82到146；添加图片；等待保存；刷新并重开；image回到82，新节点也重排。截图`web-project-before-reload.png`和JSON记录前后几何。
2. 上述刷新后再次添加图片，DOM和已保存items中重复`added-image-1`。开发与preview均重复。`web-duplicate-node-id*.png`与`browser-audit*.json`。
3. 独立context模拟`read_creation_snapshot`拒绝，页面显示重试保存；点击后捕获`write_creation_snapshot({version:2,revision:0,projects:[]})`。`recovery-fault.json` / `read-failure-empty-save.png`。
4. normalize的preview输入17,825,814字符，输出16,777,216字符；结果不是“明确超限拒绝”。`contract-findings.json`。
5. `state=cooldown`且cooldownUntil早于当前时间，selectConnection仍返回null，因为canSchedule要求active。不是“等待秒数后已自动恢复”。同一JSON。
6. Web实际可导航到ComfyUI工作流目录。`web-comfy-visible*.png`与main文本；未声称其能够执行真实ComfyUI。

审计脚本保留在`tmp/launch-readiness-20260916/`，是临时取证工具，未加入正式业务代码或全仓测试集合。最初一个选择器误用data-canvas-node的值，已根据实际DOM改用data-node-id；一次Vite被审计WebView profile锁文件触发EBUSY，关闭审计窗口后重新启动固定1421并成功复验。这两次是取证环境问题，不当作产品Blocker。

审计后preview会话已结束，Desktop审计窗口已关闭；停止本轮后台Vite并删除本轮临时WebView profile的组合清理命令被自动审批审查拒绝（仅返回`blocked by policy`）。未换通道执行被拒绝的清理，后台1421进程和本轮临时profile暂留。此限制不影响已保存的报告和验证结果，也不涉及生产环境。

## VPS只读审计范围

用SSH验证系统身份、OS/kernel、CPU/RAM/disk/swap、运行时版本、systemd状态、监听端口、经过白名单筛选的Nginx路由配置、证书元数据、firewall ruleset、SSH策略、部署package版本和静态入口、脱敏日志统计。外部仅有限TCP探测、HTTP/HTTPS GET/HEAD及health。未查询业务数据；不读取.env/Environment/数据库密码/私钥；API Key/Hash未调用。

未执行：安装软件、编辑配置、重启/kill生产服务、改防火墙、DNS、容器/volume/数据库删除、网站覆盖、主机管理API动作。首轮确认服务器有旧服务，所有后续架构只是计划。

结构化事实见`docs/evidence/launch-readiness-2026-09-16/vps-readonly.json`。日志统计不能作为漏洞/入侵断言；health字段也不能代表新2.0已经部署或所有业务有效。

## 明确未验收

- 真实外部图片生成/编辑、真实成本/Usage、退款；用户给出的API凭证没有被猜测为AI Provider Key。
- 真实ComfyUI workflow、GPU、本地模型、远端取消语义。
- Desktop真实进程中断时任务对账、断电/磁盘满恢复、干净安装/升级包完整故事。
- 真实Safari/Firefox、原生Mobile/Expo/iOS/Android运行；只做旧源码参考。
- 最终正式域名、DNS权限、旧Vercel具体部署清单与实际业务数据迁移。
- VPS压测、应用备份还原、TLS续期演练、新next部署、公开端口整改。
