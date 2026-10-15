# Verification：统一现有 UI 细节

- Task ID：TASK-UI-DETAILS-20261015；状态：DONE / PASS（本次本地UI范围）。
- 产品源码：ab878ffd6560192e3f29ad5acfba737588d9ecc6；独立分支fix/TASK-UI-DETAILS-20261015。本次完整verify运行于提交前同一源码，随后无产品/测试变更；最后文档提交另行记录。
- Base：18e143f06ee6741d20d45346fd1bb77f34bef606；当前task分支，不把primary旧源码当成最新版。
- 基线：最新2.1.25 build通过，UI242文件0违规；新增真实生产浏览器RED为6失败（其中扩展初始locator歧义已修正，单项重跑真实轴线差145px）。
- 首轮GREEN：设置密度/目录对齐通过；首页模式仍被残余8px覆盖，已按根因删除；重载测试误停留首页，改为通过公开项目库重开并比较原件SHA256，保留失败原件。
- 原始证据：D:/kk-studio/.analysis/ui-details-20261015，red/red-catalog/green-1/green-2分别保存，不覆盖历史。
- 开发启动：node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort；Vite development；URL http://127.0.0.1:1421/；script=/src/main.tsx，data-runtime-mode=development。
- import链：main.tsx → App.tsx → StartPage/StartComposer、ConversationPanel/ConversationComposerRegion/AgentComposer/ConversationComposer、SettingsPanel/SettingsSections、SkillsPage/SkillPageControls；App统一加载页面CSS，composer最后管理输入框。
- 完整verify、production Web和新Desktop、独立源码审查均已完成；证据如下，不以旧PASS替代。
- 真人Provider、付费调用、Hosted、安装器/签名、实体手机及用户视觉接受未验。

## 失败保全与根因修复

- 完整verify首轮：Node/Agent/静态门禁通过，浏览器623pass/12fail。旧1280×800及240导航、首页生成参数、非空图上传契约已被新反馈覆盖，更新原断言而非恢复旧UI。尾组包装后的图标selector更新，仍检查原图标数量/尺寸。
- 首轮新增测试错误：截图info参数缺失、680.000015物理几何小数，已修为明确testInfo和注册高度的整像素断言；原日志/JSON保留。
- 视觉复核发现扩展根section缩窄后露出外侧背景；修成全宽外壳+单一内部1440轴，并增加shell=parent宽度断言。
- 独立复核与development DOM：390首页旧尾按钮top302/302/338；手机保留flex动作组并补同排检查。
- 独立上传逆缩放RED：50%空image按钮32px高但hit:false。共享imageSelectionPosition将可见独立上传上沿纳入工具栏锚点，两个调用共用。空图喜欢/标签/删除保留，不以隐藏整个工具栏掩盖。
- green-5：31项首次通过，含空图/视频真实filechooser、32px和hit:true、位置保留、非空无重复上传、重载原件SHA、编辑器草稿及工具栏恢复。完整verify第二轮待结果。
- 完整verify第二轮：633pass/2fail；两个手机夹具重复点击已经选中的卡片，被合法展开编辑器遮挡。确认addNode默认选中并focus后，改为明确选中断言或跳过已选中时的重复click；未放宽拖动、重载、菜单或长型号断言。定向green-6为2/2。
- 最终源码完整verify第三轮：exit0；Node 1278pass/14skip、Agent 199pass/2skip、浏览器635/635首次全通过、development插件四条真实路径PASS；lint/typecheck/format/UI239文件0违规/build均通过。日志verify-3.log及verify-3-browser-results.json保存在原始证据目录。
- 源码检查阶段曾将Desktop和独立sourceSHA保留待验；以下为随后实际完成的结果。

## 当前Desktop与收尾

- 由现有start-kk-studio.bat --background --data-dir触发官方Agent构建，exit0；Desktop/Web2.1.26，Mobile2.1.1规划不变。release路径src-tauri/target/release/kk-studio.exe，EXE SHA256为0f65d3825f046ee57be6629975c43fda95f7a2591d67a23a902a4a2d9d23e0d2，输入指纹864b0376eb3c6a97f2e395e36d673d9eefeebc73adae17369e5893f9291f28b6。当前receipt reason=current；这是本地构建身份，不是Hosted发布或安装签名。
- 原生第一轮33项UI断言后，检查脚本因reload后自身guard未装载而失败，native-ui-details.json及截图原样保留；未将该轮隔离断言计为PASS。新native-run-2取消reload/preload，在当前document明确安装/检查guard，并通过现有UI暂停独立实例自动连接。
- native-run-2正式38项PASS：真实http://tauri.localhost/，production / src/main.tsx，1920×1080；独立data/profile/CODEX_HOME，不接管日常资料。普通设置960×680、分类208，模型接入1120×680/方式160，返回更新恢复960；首页/Agent无画布生成参数，999文字胶囊、8px图标/32px命中，尾组不拆；扩展六轴误差≤1px且无横向溢出。卡片上传、真实filechooser、50%命中和重载原件由本轮production浏览器覆盖，不冒充Native卡片专项。
- Native加载index-DZs3PY0u.js（960013B，SHA256 b45466b792ecfbca45dfb7830031dade3fd5f0936f0409a8d663b5922564782a）与index-TdG4ceMg.css（333785B，SHA256 5c30774b6c10e3ed90bde63d2457ae05a1a08ea383faa491892c7bd2dc14d8a4）均与当前dist字节相同。import链已在上方记录，未加载旧primary脚本。
- 原始报告/五张截图、process、shortcut和build receipt在D:/kk-studio/.analysis/ui-details-20261015/native-run-2。桌面“启动 KK Studio”现有目标仍是本工作树KK Studio Launcher.exe；无需改入口，下次正常打开使用本次2.1.26。只读核对，没有重新安装或启动日常profile。
- 两轮owned实例均经“关闭窗口”正常退出；9426无监听，未杀其他实例，测试数据/旧失败证据保留。源码/测试由ui_independent_review在精确ab878ffd上独立审查PASS；该审查未自行重跑测试，Native由root实际执行。
- 既有Node14/Agent2 skip、Rust5个未使用代码warning及健康/体积advisory仍按原义保留；本次未关闭有效检查。未新增依赖、变更配置身份或执行迁移，primary旧dirty/index未改。本次不含推送、合并、安装器、签名、发布、真人Provider、实体手机或用户视觉接受。
