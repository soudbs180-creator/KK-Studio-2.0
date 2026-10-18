# Review：手机结果优先与完整输入范围

- Task ID：TASK-MOBILE-COMPOSER-001；NOT_VERIFIED；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。base97ef，当前branch见Intent；最终追加范围head待冻结，不沿用首轮head批准。
- root实施产品/测试/版本；本包文档代理参与诊断和文档，不能将自己当成最终独立reviewer。正式review须另一上下文绑定已提交base/head。

## 审查重点与已知问题

- 必查任务/历史先显示图片、视频或文本，详情结果→提示词→展开更多；unknown/partial/错误/保存进度及有资格停止/核对/恢复动作仍可访问，缺失/损坏原件明确提示，hidden历史引用保留，视频不自动播放。
- 六入口初始可见，模型名可点击；onPress完成语义、键盘、取消触摸、320窄屏及390矮屏命中不回归。小于360px使用44px圆形六控件/gap1/活动区水平padding8同排不折行，390px保留48px。手机与Desktop发送本身直接圆形、与同排按钮同高，运行/停止/禁用语义保留。
- 上传原字节保存与引用、库条目预览/明确追加及语音拒绝/迟到回调保持账号/项目边界，不自动发消息；远程Agent/MCP不能由UI入口冒充可执行。
- 12ai参考编辑只允许官方origin/根路径与明确模型；原件身份/hash/MIME/大小先验证，multipart仅请求内存，通用接口与不支持的文本/视频/文件/遮罩拒绝，无Key外发或静默忽略。
- 尺寸仅本次运行状态，经提交捕获既有task.imageSize；无声明不能指定，切类型/模型或未发刷新回自适应。旧v39完整reader与backup/preflight/restore合成兼容证据已PASS，不新增draft/schema/storage/backup，ADR-025继续适用。
- 本地根完整verify exit0（Node1852/20skip、Agent199/2skip、根浏览器832首试+1项5xx flaky、DESIGN41+8/development4），flaky另以retries0复核1PASS，未关闭未知根因。Mobile433/type/lint、旧reader兼容、窄屏最终40/40与gzip增4319B预算通过；精确head冻结/独审、Hosted及生产仍PENDING，不把本地通过写成最终放行。
- 首轮Mobile40项32PASS/8FAIL保留：aria-pressed语义、当前dialog关闭等待及隐藏旧路由错误定位已分别修正，第二轮40/40后再修320px折行，最终run d032d819为40/40。语音路由失焦取消与上传A→B→A/换账号epoch保护有真实RED/GREEN，最终定向10/10，不借存储迁移解决运行时竞态。
- 截图文件全黑误判已由独立完整字节/像素取证纠正；不能把正常辅助img opacity0当源码缺陷。15分8秒恢复与截断network、2秒可见状态冻结模拟、实体Android/Safari未验分别记录。
- 原TASK-MOBILE-12AI-001仅按PR70/71实际图文发布/收据有界收尾，不把其产品审查或27份live输入复核移用为本新head批准。

## 门禁与结论

用户追加结果优先、六输入入口、共享圆形发送与功能同态后，da0d独审冻结为PRECHECK_ONLY（工程外composer-final-review.json SHA7a60498c…）；PR72仍未合并、未发布。取消手势和稳定绘制的测试在该head之后补充，短屏旧截图曾在RN Web Modal初始opacity0时过早采集，最终须等待真实绘制并核对命中/视口；不能用旧短/横屏截图冒充完整可见。新范围含12ai参考编辑与本次尺寸，须最终已提交head另一轮正式独审及实际CI/生产验收。

追加范围dirty源码预检 `expanded-precheck-review.json` SHA `56494da945f9071b8ce33bafe9a64f29110cd58c2e31c1d7f51c11ed13e87b6e`已回读：两项P1（路由语音、旧上传覆写）及两项P2（Native取消稳定、忙时语音禁用）闭合，范围内无P0/P1；结论仍仅PRECHECK，不能作为最终已提交SHA独审或Hosted批准。

最终Self-review、独立AI review、正式Delivery/Hosted、生产入口/库存和用户结果接受均PENDING；当前结论NOT_VERIFIED。最终源码提交与验证/审查精确SHA绑定另冻工程外，避免自引用SHA反复改文档；参与实施/文档的代理不能充当最终独立reviewer。手机/桌面同功能是目标，远程Agent/MCP、新Native、Safari/真实后台未验边界保留。不伪造GitHub人类approval，不放宽有效门禁。用户已有修复/上线授权，无额外生成额度授权；按正常PR/正式Release及单previous执行，部署前不得宣称已上线40。
