# 复现与来源

- FACT：834×1112时现有235px侧栏加`left:calc(50% + 160px)`对话规则，使对话面板仅约134px；标题逐字纵向折行，模型和输入操作溢出。before/834-chat.png。
- FACT：390×844首页保留61px侧栏，工具栏在仅约260px内部空间随机换行；模型图标和文字被space-between分离。before/390-landing.png。
- FACT：HUD用flex-wrap使导航与对话按钮进入不同的不确定行；手机任务、项目状态和工具条缺少明确层级。
- FACT：规则将桌面专项紧凑尺寸用于窄屏，平板801–1200没有独立导航/面板策略；一些历史规则仍要求单行并扣除窄屏聊天宽度，与可读性冲突。
- FACT：Figma 404:28336使用26px统一图标槽，保留图形实际尺寸；当前窄屏各图标span各自尺寸不一致。Figma中300ms收起动画已按产品触发适配，本轮不复制设计稿的无限循环。
- INFERENCE：依据旧库手机安全区、独立导航和三档分类，采用本规格的全宽手机+紧凑平板，优先修复结构再校对细节。

基线构建入口：Vite production preview http://127.0.0.1:1423，App→TopBar/Sidebar→StartPage/LibraryPage/Canvas→CanvasHud/ConversationPanel；设置经Modal→SettingsPanel。before取证使用独立浏览器上下文；未连接真实Provider，示例新建项目保留原始能力标识。

独立审查发现并整改的边界：844×390短高轨道采用底部绝对坐标导致导航和搜索/设置重叠；对话overlay跨断点登记晚于子菜单导致Escape顺序与焦点错误；横屏会话重复margin叠加最小高度裁切发送按钮。对应修改与同状态量化复验见review.md与responsive-layout.spec.ts。菜单监听改用同一DOM提交的layout effect，已渲染状态不依赖被动effect时机。
