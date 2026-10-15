# Spec：首页默认Codex与模型选择分流

- Task ID：TASK-CODEX-HOME-20261015；状态：REVIEW；整体NOT_VERIFIED；2026-10-15。
- [Intent](intent.md)、[plan](plan.md)、[verification](verification.md)、[账本](../../governance/task-ledger.json)。
- 基线：main `cbda65e4389fc807769a8faf7654892415992589`；UI真值仍由[UI_INDEX](../../UI_INDEX.md)路由，数值来自`tokens.css`。

## 用户行为与入口

| 入口 | 新缺省/显式选择 | 执行契约 |
| --- | --- | --- |
| 首页新草稿 | 缺省Codex图片能力，允许显式选择可用API | Codex进入当前项目Agent链；API进入原Provider链，不因一种通道不可用而静默切换 |
| 项目聊天 | 使用当前对话的显式来源和账号/型号 | Codex/其他已有来源沿既有适配器；不凭模型名称猜测账号 |
| 画布生成 | 保留显式Codex/API来源与已有`generationSource` | Codex经`Agent.generateFromCanvas`，API经既有Provider/TaskHost；无selection旧项目保持legacy路由 |

来源、连接ID和能力类型组成选择语义；展示文案不能取代路由。选择API后缺配置显示真实原因，不使用Codex“兜底”；Codex未连接时给连接入口，不要求用无关API Key解除门禁。已有API任务、unknown受理和失败重试语义不变。

首页、聊天与画布不得因共享菜单复用而互相覆盖当前选择或草稿。显式选择和其后编辑的prompt/附件/局部隐私/审批值保持；切换来源不能清空不相关字段。旧schema、旧项目和无selection值按原兼容策略读取，本轮不批量持久化新的来源默认值。

### Dirty预检后的必要契约（修复与最终验收待完成）

- 每个项目分别持久化模型选择和执行通道；切换到legacy项目时沿原语义恢复，不受新首页的图片意图或另一项目选择污染。`pendingAgent`只承担首页失败fallback，不能把普通API草稿变成待发Codex任务。
- 原生项目包严格接纳当前合法项目字段`modelSelection`、`providerConnectionId`、`pendingAgent`（boolean）、`conversationChannel`（`codex | direct | google`）、`agentGeneratedImageIds`以及item的`generationSource`、可选`mediaWidth/mediaHeight`（各自为2..100000有限整数，保持原值不舍入）；仍使用对应类型/枚举/集合约束，未知或非法字段继续拒绝，不通过宽松透传解除导入失败。
- 保留的legacy首页count8在当前所选通道不支持该数量时明确disabled，只有用户显式点击框外改为1的按钮才改变数量，不能静默截断。合法4项提交失败后的重发仍保持4，不因重新归一化丢槽。
- 原生启动时若旧project已有connect flight，新首页创建项目后的连接必须完成归属交接，避免沿旧project返回后停住新项目；继承原有幂等、取消与会话归属保护，不重复提交生成。

## 输入、菜单和异步状态

- 首页与对话输入区消费共享尺寸；长模型名先弹性收缩/省略，保留完整可访问名称。390/1099/1920下验证模型、扩展和语音/权限/发送同排；语音/权限/发送为完整动作组。
- 默认Codex标准名称必须完整可读，只有实际长名称才省略；不能以裁成几像素、缩短产品文案或放宽断言解决同排问题。旧API门禁场景显式选择API作为前置，保留其行为断言；多附件布局fixture使用不同内容图片以避免按字节去重后只剩一张。
- 输入无多余底线或横向装饰，focus-visible、输入错误和禁用原因仍可见；不得靠移除焦点或错误状态获得视觉通过。
- 模型菜单按触发器实际rect与可用视口定位，空间不足时翻转/约束并内部滚动；量测前不暴露在页面原点，滚动、resize及visual viewport变化后仍可达。关闭、Escape、点击外部和回焦保持。
- loading/running禁重复提交；取消、断网、超时、审批与unknown保持区分。迟到回执不得改写另一来源/项目；IME组合输入不触发发送。
- 附件读取完成必须使用当前回调、当前容量上限与整批校验，不能由旧callback把新prompt/source/草稿字段覆盖；无效整批不能静默降成纯文本提交。
- 询问模式的pending确认仅对同一draft身份有效；source、prompt等相关输入改变后不得确认旧请求快照。
- Codex首页新项目尚未开始Agent生成时，不生成虚假的TaskHost pending状态；初始状态为undefined，实际Agent回执驱动状态。API保留原pending/TaskHost语义。
- 共享菜单按实际visualViewport的offset与width/height约束并对称监听resize/scroll；布局viewport不代替缩放或软键盘后的实际可视范围。当前动态测试仅证明scale2且offset0，不承诺已测非零偏移或原生软键盘。

## 架构、数据与权限

- 复用`ModelPickerMenu`、`modelSelection`、creation模型与既有Agent/Provider执行层；领域层保持纯净，不直接调用宿主或密钥库。
- 旧项目的providerConnectionId、generationSource、线程、任务、原件ID和画布位置保持；正常快照/CAS/失败冻结契约沿用[DATA-STORAGE](../../architecture/DATA-STORAGE.md)。
- local-only/局部隐私仍阻止不允许的外发；来源切换不绕过已有隐私、审批、附件与取消门禁。
- 实际账号token和API Key不进项目、localStorage、URL、日志或证据。Codex文本型号与内置图片型号分开记录；上游没有图片型号就如实未报告。
- 不改变存储identifier、data root、profile或快照/项目包格式版本；来源元数据按可选字段向后兼容，严格读写规则在本spec记录。沿既有执行与存储体系，不新增跨端服务或权限，因此无需另立架构方案；若发生格式迁移或权限边界变化则补ADR与复验。
- 项目包仅同步前后端已定义字段的严格读写兼容，仍拒非法；该差量必须补原生导入/导出与现有旧包回归，不能沿用修复前Rust结果。

## 平台与生命周期

| 能力 | Desktop | Web | Mobile |
| --- | --- | --- | --- |
| 共享输入、菜单与来源选择 | 本轮待验 | development/production分别待验 | 仅响应式Web，非原生 |
| Codex真实文本/内置图片 | 本轮当前版本待验 | 本机伴随/Agent依赖按实际可用性显示 | 不承诺原生实现 |
| API直连、旧项目恢复 | 保留原有能力及限制，fixture不当真实供应商 | 保留原有能力及限制 | 规划不变 |

初始化只给新首页草稿缺省值；正常使用沿显式来源提交。取消/离线保留prompt和选择；损坏、保存失败或重启恢复不替换为“空项目成功”。回滚以Git修复/前一已验收版本及工程外数据副本恢复，不自动覆盖用户资料。导出/卸载行为未变。

## 验收映射与边界

- AC-1/2：单测覆盖新缺省、显式API/Codex、无selection旧项目、能力类型与连接ID；浏览器断言真实提交路径和不串源。
- AC-1/2/4还须覆盖四组P2：原生严格项目包往返/非法拒绝、跨项目模型/通道恢复与API草稿隔离、legacy数量显式改1及合法4项重发、旧project启动flight转交新项目。
- AC-3：实际点击命中、同排几何、textarea computed style、菜单可视rect、键盘/IME/Escape、长名称和窄/短屏；不以DOM存在替代可交互。
- AC-4：当前源码对应的官方Desktop构建，真实账号一次文本及1张图片，图片事件/原件/资产hash与唯一节点，正常关闭重开与旧数据逐对象保全。
- AC-5：当前完整verify、相应Native与Rust、版本/Delivery、精确base/head独立review、Hosted原JSON无隐藏flaky、PR/main与实际入口/EXE/profile身份。
- 本地分项证据按verification分别登记，整体仍NOT_VERIFIED；前置main真实账号证据只证明原链路存在，不代填新首页链路。full5浏览器通过但development未执行，必须由当前SHA的Hosted完整门禁补齐；外部API、其他账号适配、发布安装与Mobile能力状态不升级。
- 当前旧数据保护以用户最新7项目/rev2057快照为准；先前10/11项目是历史时点，不能据此回灌用户已删除项目。
- candidate1独立窗口的后续用户编辑按用户明确授权恢复为新ID副本，目标2cards/1新asset，canonical原7项目逐对象保留。先保存完整备份并校验可读原件；整项目包若因未归档媒体拒绝就保留失败，不绕过校验或覆盖旧项目。副本恢复完成、资产身份和旧项目保全均需实际收据。
- 旧项目保全报告必须区分已有字段保持与整对象byteexact；candidate2加载仅在一个旧empty project补空reviewComments/stagePlans，须列出新增字段及无卡片/任务改动，不把该状态写成整对象完全相同。canonical原根仍按7项目/rev2057原始快照保护。
- 最新恢复范围为两次窗口编辑分别形成两个新ID副本；只读核对的输入为2项目、各2cards及1个共享asset，跨项目thread绑定已移除。先前单副本计划保留历史，canonical实际写入/原7保全仍待验，不覆盖原项目或擅自合并两份编辑。
- 真实生成item的mediaWidth/mediaHeight须按领域约束在严格项目包合法往返，非法尺寸仍拒绝。Native33单QA导出已因白名单遗漏而失败；不得用旧项目未归档媒体的另一拒绝原因掩盖此产品缺陷，修复后须实际export/preflight/import。
- 媒体尺寸仅接纳各自可选的2..100000整数，保持原值且不舍入，未知字段继续拒绝；Rust定向/全量通过不代替重建后Native包往返。TaskHost隔离fixture只证明所绑定EXE/源码范围，不升级为真实外部Provider结果。
