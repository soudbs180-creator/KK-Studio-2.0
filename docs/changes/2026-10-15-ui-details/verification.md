# Verification：统一现有 UI 细节

- Task ID：TASK-UI-DETAILS-20261015；状态：IN_PROGRESS / NOT VERIFIED。
- Base：18e143f06ee6741d20d45346fd1bb77f34bef606；当前task分支，不把primary旧源码当成最新版。
- 基线：最新2.1.25 build通过，UI242文件0违规；新增真实生产浏览器RED为6失败（其中扩展初始locator歧义已修正，单项重跑真实轴线差145px）。
- 首轮GREEN：设置密度/目录对齐通过；首页模式仍被残余8px覆盖，已按根因删除；重载测试误停留首页，改为通过公开项目库重开并比较原件SHA256，保留失败原件。
- 原始证据：D:/kk-studio/.analysis/ui-details-20261015，red/red-catalog/green-1/green-2分别保存，不覆盖历史。
- 开发启动：node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort；Vite development；URL http://127.0.0.1:1421/；script=/src/main.tsx，data-runtime-mode=development。
- import链：main.tsx → App.tsx → StartPage/StartComposer、ConversationPanel/ConversationComposerRegion/AgentComposer/ConversationComposer、SettingsPanel/SettingsSections、SkillsPage/SkillPageControls；App统一加载页面CSS，composer最后管理输入框。
- 当前完整verify、生产最终截图、独立审查与Desktop新构建待记录；不以旧PASS替代。
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
- 源码检查完成，Desktop2.1.26新构建、原生production资源哈希与独立sourceSHA审查继续验收；本段不提前声明Desktop完成。
