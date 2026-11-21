# Verification · Pen 同步与展开控件

- 基线 `e4383a1e323c895286d9f08fe901a27e341a10da`。实现提交 `d81b218c402de382a544332426a55f173228bbd3`。运行产物中的源码输入由同包 ui-map.yaml 和桌面启动器收据绑定。
- 当前候选 Desktop 2.1.44、Web 2.1.43。独立 Mobile 2.1.42。正式分发未开始。
- 证据根目录 `D:/kk-studio/output/kk-design-pen-sync-20261121`。历史失败和实际重试都保留。

## Pen

现行文档 `b1c8c2e7-1733-4af4-843e-5c7962ed3f49`。通过 Pen MCP 更新并保存 `CzGXd` 与 `d7z7Ci`。保存后回读边界无裁剪。展开图标由 gSHZ5 原样导出，CSS mask 继承语义文字色。收起旋转对应 ToSeM。证据为 pen-before/QnbwN.png、pen-after/QnbwN.png 和 pen-readback.txt。

## desktop-settings-content-disclosure

证据文件 evidence/desktop-settings-content-disclosure.json

先用 start-kk-studio.bat --background --data-dir <隔离目录> 重建实际桌面产物，再在私有 Windows 桌面启动同 SHA-256 的 EXE，以独立数据目录和 WebView2 profile 验证七个共享样式消费者。访问 http://tauri.localhost/，通过仅绑定本机的 DevTools 连接检查。每个入口均验证标记隐藏、两方向图标、Enter、Space、焦点和截图。H3 视频模型候选来自本机手动硬件检测步骤。见 desktop-build-receipt.json、native-expanded/native-disclosure.json 和同目录截图。

## web-settings-content-disclosure

证据文件 evidence/web-settings-content-disclosure.json

实际 production dist 由 Playwright 启动 Edge，preview 为 http://127.0.0.1:1423/。首页设置按钮 → App modal → SettingsPanel → 通用／网络／模型接入／数据管理。1366×768 深色与 390×640 浅色检查六个入口的 mask、方向、标记、文字宽度、点击、Enter、Space 与焦点。第七个 H3 候选在 Web 的硬件响应夹具中检查实际 DOM 与指针展开，真实硬件路径由 Desktop 收据覆盖。设置相关 27 项通过，无失败、重试或跳过。扩展初跑曾错误等待桌面隐藏的窄屏返回键，修正导航后复验通过。同一生产页实际加载脚本 index-B7uPXtPs.js、SettingsPanel-D3kZ3wrt.js 和样式 index-HfztjAyf.css，HTTP 字节与磁盘 dist 一致。收据记录各资源 SHA-256。见 web-loaded-bundle.json、expanded-browser-results.json、expanded-browser.log 与运行目录截图。

## 代码与门禁

- 全仓单测 1979 通过、20 跳过，见 `candidate-unit.log`。UI 标准与版本一致性通过。
- 现有 delivery CI 安装锁定依赖并检查当前 Git HEAD 的 UI map。首次精确提交缺少 Desktop 状态，CLI 以两项缺失证据拒绝。定向测试覆盖缺映射、缺节点、缺收据、篡改收据、路由/定位漂移、旧源码、共享依赖漂移与 Mobile 路径。Git 检查确保同包收据可读取和版本一致，实际内容由独立复审核对。
- 全量 verify 首轮通过，含 841 项生产浏览器检查、8 项设计预览与插件联测。首轮之后变更了交付脚本、测试和文档，UI 产物输入沿用当前映射中所列 Git blob。精确候选、门禁与独立审查记录见 review.md 及证据目录。

## 候选复验

- exact-verify.log 退出 0，根单元测试 1980/20 跳过、Agent 204/2 跳过、生产浏览器 841、设计预览 8、插件联测通过。进程启动后补正了交付脚本与文档，Web、Tauri 和浏览器测试源码跨提交保持相同。
- 交付补正提交 5d64ae2a94827bbca0762fc3caff9bedb736df3d 通过精确 delivery、lint、版本及 UI 检查，以及 delivery-unit-final.log 的 27 项交付相关单测。DESIGN.md 官方检查保留 25 条非阻断提示。见独立复审记录。
- 现行 Pen 导出的 gSHZ5 与仓库 mask SVG 的原始字节一致。两端字号和其它图标沿用已注册规则，仅设置折叠应用本批修改。

## 待处理

主线设置、资产与搜索仍走 modal，Pen 场景是工作台内容区。需要分批移植并验证资产选择、滚动、搜索、焦点与草稿状态。对话记录的业务行为在 Pen 与本地有冲突。真正的会话列表功能须经单项裁决。未检查的页面与独立原生 Mobile 留在 ui-tasks.json。
