# 逐页迁移验证（TASK-DS-002）

## 范围与身份

- 唯一目标工程 `D:/kk-studio/KK-Studio-2.0`，本轮在 `C:/Users/Administrator/.codex/worktrees/design-system-pages/KK-Studio-2.0` / `fix/TASK-DS-002-pages` 执行。
- Git base/head同为 `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`，用户要求不commit/push；实际基线是882路径未提交候选，不能用空Git提交范围代替本轮diff。回传前依据临时原始快照、review-delta.patch与最终source-manifest比对。
- 来源：DESIGN-SYSTEM 1.1 → global/ui-tokens → catalog-pages/settings/sidebar → App → LibraryPage/CatalogPageBody、SkillsPage/SkillCollection/SkillEditor、SettingsPanel。Landing/Workspace已有来源几何继续保留。
- Web：每次先 `npm run build`，由Playwright启动 `vite preview --host 127.0.0.1 --port 1423 --strictPort`，URL `http://127.0.0.1:1423/`，通过侧栏进入对应目录。浏览器Edge、生产模式。
- Desktop：`npm run client:build -- --no-bundle`，然后 `node scripts/audit/check-design-system-desktop.mjs`，独立EXE进程、临时 `--data-dir` 与WebView2 profile，CDP9338仅连接自己启动的实例；URL为 `http://tauri.localhost/`。关闭并确认自有进程退出后，使用同一隔离目录重启。

## 复现与修正

1. 首次目录契约RED：标题40px、旧卡片圆角、搜索框bg-card/旧尺寸与标准不符；修正共用样式，补原生字段 `.ui-input`、筛选aria-pressed与分组语义。最初测试按不存在的“打开侧栏”/Skill预览按钮查找；根据Sidebar/SkillRecordCard实际公开入口修正定位，窄屏按现有Escape行为关闭导航遮罩。测试仍真实点击保存、取消与回焦。
2. 目录与设置首轮9项通过。第一次完整verify为309 Node、227 browser直接通过，另1 browser重试通过；`connection-drag`插件菜单End焦点断言出现一次flaky。未删除或放宽断言；最终检查另行记录，不能把这次称0flaky。
3. Rust check和Tauri no-bundle build通过，保留现有5项dead_code警告。第一次桌面16种主题/强调色组合、11设置分区、2次启动、实际JS/CSS字节SHA匹配、偏好与Skill重启保留通过；原记录存入 `evidence/desktop-before-icons/`。
4. 人工截图发现浅色侧栏单色图标/Logo不可辨。新增测试在浏览器按实际SVG与CSS filter绘制，读回像素；RED为图标1.398、Logo1.0对比度。定向映射浅色前景，保留来源SVG、槽位与两色复合图标，不对界面做全局滤镜。

## 当前检查

- 页面对齐和截图：`tests/browser/design-system-pages.spec.ts`，双主题8色；390/768/1920目录；390/1920设置/Skill编辑；实际SVG颜色。
- Desktop脚本报告只覆盖界面偏好/本地Skill重启，不是TaskHost进程恢复或真实Provider/GPU验收。
- 最终verify、更新后的Desktop复验、独立审查和当前工程回传尚在执行。以本页随后追加的最终记录为准。

## 最终候选验证

- `npm run verify`：PASS，309/309 Node、229/229 Playwright/Edge，0失败、0flaky；包含lint、typecheck、UI137/0、format与production build。完整日志 `evidence/logs/kk-ds-pages-verified.log`。
- 原End断言已依据插件并发激活/实际菜单顺序校准；补齐第4个“便利贴”等待条件后，同用例在5尺寸连续3次无重试PASS。最终10项UI专项另存截图与日志到 `evidence/web/`，验证现行最后版本。
- 独立预检两项P2修正后复核PASS：长分类overflow0，16组合选中边界最低5.475:1；12文件manifest SHA `1450ad29a8c9bd9df9f41166c179c06f04ba1697f0ef85f61f3684eb95bf1bbe`。见review.md；用户视觉/正式PR/发布不在该PASS含义内。
- 最后重新 `client:build -- --no-bundle` PASS，Rust release编译26.18秒，保留5项既有dead_code警告。`evidence/desktop/runtime.json` PASS：1920×1080，16种主题/强调色、3目录与11设置分区、2次启动；没有pageerror与cleanupFailure，自有进程关闭成功。
- Tauri实际响应的JS `index-5VZfov1W.js`（721416字节，SHA256 `4bb5fe96eb49b86d36380c32122f33824331ff66f79615e0205655c4602d57da`）；CSS `index-BqNAAUWQ.css`（198104字节，SHA256 `eae1aac3a6fd2c12d4a4e875b0563e5d1068e54ccf1aaf0d3cd0367aa4f529d4`）。两次启动均逐字节匹配当前dist。
- 候选EXE SHA256 `11ca39aa247f921efb4bfe80432d03ce77a3e2082dfedc268fca68fc8acad097`。使用同一临时数据/profile重启，light/green偏好和“桌面设计系统验收”Skill保留。本检查不涉及用户原始数据与凭据。

附：校正SVG注释后，UI字面量guard与Prettier曾分别拦截注释/换行格式；均修正源文件后重新检查，未改变检查器。前一次未通过的完整验证没有被当作最终PASS。

## 未覆盖边界

在线Ardot变量/组件实例仍未写入；缺失页面Frame和用户最终视觉验收不能用规范一致性替代。T5任务恢复/health、T6原生生成、真实Provider/MCP/云账号/发布与托管CI继续由原账本任务跟踪。

## 原工程回传与最后验证

- 回传前逐路径核对原始快照，79个源文件/文档/证据文件零冲突；12个审查范围文件指纹全部匹配。既有业务文件不在回传范围者与882路径基线一致。回传备份与清单见integration.json。
- 当前工程完整verify通过：309 Node、229浏览器、0失败/0flaky；lint/typecheck/UI137/0/format/build均PASS。原工程重新Tauri no-bundle build与16组合、2次启动、偏好及Skill保留复验PASS；独立预检修正复核PASS。
- 原工程EXE：`D:\kk-studio\KK-Studio-2.0\src-tauri\target\release\kk-studio.exe`，SHA256 `8a98e7e8c64a31885a7d05c7d4429a25c360566729f15cac275205d5a35d9526`。两次启动实际加载的JS/CSS与本页候选相同，`evidence/desktop/runtime.json`记录原工程运行；候选最终记录保留在`evidence/desktop-worktree/`，更早截图保留在`desktop-before-icons/`。
- 标准verify会重新生成`docs/evidence/`通用测试输出；这些新输出属于本轮，不能拿来证明旧日期验收。本轮完整JSON与截图另存到本change目录，历史文字记录保留原含义。
- TASK-DS-002标记DONE/PASS仅表示本批工程契约完成；其余缺口保持原状态。没有commit/push、PR、安装包发布或真实Provider调用。
