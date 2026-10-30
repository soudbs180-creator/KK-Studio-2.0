# Spec：稳定的手机创作控件生命周期

- Task ID：TASK-MOBILE-COMPOSER-001；READY；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。设计沿根 DESIGN、独立Mobile聊天UI及现有 Composer/Toolbar/Sheet，数据边界沿 ADR-011/019/025。

## 状态与交互

现有空text的active只由输入focused等条件决定；失焦会卸载Toolbar，而RN Web onPress在click才交付。主代理已在真实本地浏览器复现聚焦→按钮出现→点击后工具栏消失、未打开面板。

将组件内focused状态改为interacting锁存：首次onFocus置true，不在onBlur复位。进入后工具栏在同一Composer生命周期内保持挂载，切项目/账户的既有组件key重挂载自然重置。初始空文字仍紧凑；已有prompt、附件、image/video的active规则保持。模型继续使用完成后的onPress，保留键盘与触摸取消语义，不用onPressIn提前执行或任意延时抢事件。

ModelPicker/Sheet沿现有连接选择、搜索/手工模型与关闭流程。无Key/连接不能禁用模型查看入口；生成门禁不变。不主动发现模型、重新生成或改变Key保存策略。

## 数据、平台与恢复

- 不改变任务/原件/草稿schema、namespace、credentialRef、Provider、账户或服务器业务数据库，不迁移或删除数据；仅局部临时UI状态，无需新ADR。
- 影响独立Mobile Web的Composer；Android/iOS原生源码共用该组件，但本次不宣称原生包或实体设备通过。Desktop不改。
- 以隔离浏览器测试草稿/原件，实际用户浏览器仅核对既有资料；四视口/触摸、鼠标、Enter、取消和短屏面板为必要运行证据。
- Web2.1.40/Mobile2.1.5为候选；当前正式39/previous38是既有观察。新正式Release成功后才将39作为唯一previous，健康异常沿既有受限控制器回滚，不实际演练降版以免触碰业务。
- 原始JPEG全字节/像素取证已纠正“文件全黑”；浏览器长停留刷新可恢复原件不等于实体安卓后台/内存驱逐/Safari/PWA通过。网络截断的时段不声称完整零请求。


---

## 保留的远端同任务历史版本（origin/main 4610c333）

以下为远端同名历史文档原文，保留该分支当时的结论、失败及发布边界；不替代上文历史记录或当前主线交付包。两份原文 Git blob 身份另见本轮外部合流清单。

# Spec：结果优先与手机完整创作输入

- Task ID：TASK-MOBILE-COMPOSER-001；IN_PROGRESS / NOT_VERIFIED；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。设计沿根 DESIGN、独立Mobile聊天UI及现有 Composer/Toolbar/Sheet，数据边界沿 ADR-011/019/025。

## 状态与交互

### 当前 UI 与功能契约

菜单“任务”和生成历史的卡片首先展示已保存图片、视频或文本结果，无结果时显示真实任务状态/输入摘要；状态、失败与部分保存信息不被结果遮蔽。详情为结果→提示词→更多详情，任务身份、时间、原始回执及技术明细默认折叠，必要停止/核对/恢复动作仍可访问。历史隐藏素材仍保留引用，缺失/损坏明确提示；列表沿现有FlatList窗口化，视频无自动播放，离开页面停止。

手机输入初始即提供上传、模型、参数、扩展、语音和发送六入口，同排完整显示，不能折行、裁切或互相遮挡。宽度小于360px时六控件均为44px圆形、间距1px、活动输入区水平padding8px；390px使用48px同高控件。模型图标和当前模型名都可打开选择器，不依赖输入焦点。手机与Desktop共享发送图形/语义色修正，按钮本身直接圆形、与同排按钮同高；运行/停止/禁用语义保留。

上传可从设备导入图片或文件，校验并原样保存本机原件，再向当前草稿加入引用。取消不写，账号/项目变化或路由A→B→A时由运行epoch拒绝迟到引用，不覆盖新草稿；持久草稿只存既有附件身份，不放入base64。扩展使用已有角色/提示词/Skill条目，进入详情预览并明确选择追加/替换；取消不改草稿，不自动执行工具或生成。语音只经明确手势启动浏览器识别，拒绝权限/不支持/超时可见；手动编辑、会话切换、保留聊天路由失焦、隐藏、离线和卸载停止并拒绝迟到文字，不保存音频、不自动发送。

手机和电脑使用同一套已实现功能与任务/原件语义，按屏幕改变UI和内容重点；本轮不将Desktop Agent专属来源、Google/Codex通道或本机MCP进程推断为手机已可远程执行。普通Direct文本在Desktop也不接图片视觉输入，不能借上传按钮承诺尚不存在的文本vision链。

### 12ai 参考图与本次尺寸

仅用户明确配置的官方12ai HTTPS origin、`openai-compatible`协议及[官方GPT Image文档](https://doc.12ai.org/docs/api/gpt-image)明确支持的 `gpt-image-2`、`gpt-image-2.5-sunburst`、`gpt-image-2.5-flare`模型可接图片参考。发送前按当前账号仓库读取并校验不可变原件、MIME/大小、附件与字节身份；请求内存构造 `multipart /images/edits` 的 `image[]`、prompt、model、数量及声明尺寸，并沿既有 `b64_json` 原件归档链完成保存。未支持的地址、模型、文本/视频参考、文件参考或遮罩明确拒绝，不静默忽略，不扩大Key目的主机。

参数提供实际模态、图片数量、连接声明尺寸和服务默认值；无尺寸声明时仅允许自适应。尺寸保存在Composer本次运行状态，经提交选项捕获到既有 `CreationTask.imageSize`，重试沿原任务尺寸；不得新增 `CreationDraft.imageSize` 或任意 `parameters` 持久对象。切换类型/模型/连接和刷新未发送草稿时恢复自适应。任务已有尺寸仍可恢复，不声称未发送尺寸刷新保留。

### 首轮焦点修复的历史边界

首轮空text的active只依赖focused等条件，失焦会卸载Toolbar，真实本地focus→blur→click已复现。interacting锁存与完成后的onPress曾通过13项回归；首轮“初始紧凑只露部分入口”由上述六入口契约替代，不能再作为当前断言。保留触摸取消、键盘与组件key隔离，不用onPressIn提前执行。该轮通过和da0d独审仅PRECHECK_ONLY，不能覆盖最终新增范围。

ModelPicker/Sheet沿现有连接选择、搜索/手工模型与关闭流程。无Key/连接不能禁用模型查看入口；生成门禁保留。不主动发现模型、重新生成或改变Key保存策略。页面验收使用本地新context，任何Provider/API/POST/外部WebSocket尝试须记录并失败，不以阻断后的表面成功冒充零请求；服务协议单测另允许受控本地HTTP fixture，不接真实上游。

## 数据、平台与恢复

- 不改变任务/原件/草稿schema、namespace、credentialRef、账户或服务器业务数据库，不迁移或删除数据；参考图请求字节仅在内存，提交尺寸复用已有任务字段，备份格式不变。[ADR-025](../../architecture/adr/ADR-025-mobile-12ai-originals-and-video-recovery.md)继续适用，无需新ADR。
- 影响独立Mobile Web结果页/输入与12ai适配、Desktop共享发送源码。当前候选Desktop2.1.38/Web2.1.40/Mobile2.1.5；未更新用户日常原生安装器，不宣称新原生包或实体设备通过。
- 本地根完整verify已exit0，含832项浏览器首试通过与1项provider-scheduling 5xx flaky，后者独立retries0复核1PASS，不能概括全833项首试。Mobile433/433、最终窄屏组合40/40及产物预算通过；精确SHA冻结/独审、Hosted和生产验收仍PENDING，详见Verification。
- PR72未合并、未发布。现网正式39/previous38为此前实际观察；新正式Release成功后才将39作为唯一previous，健康异常沿既有受限控制器回滚，不实际演练降版，不重复添加临时root权限。
- 原始JPEG全字节/像素取证已纠正“文件全黑”；浏览器长停留刷新可恢复原件不等于实体安卓后台/内存驱逐/Safari/PWA通过。网络截断的时段不声称完整零请求。
