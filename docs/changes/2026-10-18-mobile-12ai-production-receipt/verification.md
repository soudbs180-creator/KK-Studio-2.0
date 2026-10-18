# Verification：12ai 手机端生产收据

- Task ID：TASK-MOBILE-12AI-001；REVIEW / NOT VERIFIED；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。
- 文档PR base/正式生产source：`9d10af39d0b028a8ddc7f06c594c813ef25b7205`；产品tree `611cf648ade1d0fb98c5474ae91615f0bbaf1a23`。前一文档候选55e仅是记录来源，不是生产source；新head尚未提交。

## 已有发布与验证

正式Release416299447/部署39107253299、main质量、线上140201/cf341da4产物、生产入口9项及current39/唯一previous38已核对，完整字段/收据/hash见[原验证](../2026-10-18-mobile-12ai/verification.md)与[Release](../2026-10-18-mobile-12ai/release.md)。原红测、本地3d5证据、canonical并发变化及库存截图的证据方法继续保留；本包不重跑或改称新生产验证。

## 文档Delivery失败与修复

root对base9d10/head `55e68766dfea24a634ab482b4b6af0e3cc6da04e` 运行实际Delivery，结果11 files / 1 violation，拒绝原因原文：`Every delivery must add a new dated change package; historical packages cannot be the sole review evidence.` 工程外日志 `production-docs-committed-delivery.log` SHA256 `5cc2daf6cc2e10f266dc6742e160abb3eb867d63af49c8303f7f706760283dc9` 保留。Markdown129/0通过不能替代Delivery。

修复按实际checker新增本生产收据五件包，并在同TASK的changed ledger record中加入本verification、匹配docs分支；未修改checker或例外。working-tree候选按原 `checkDeliveryFiles` 函数检查base9d10→55e及未提交文件，17个路径、0issues，新增五文档显式Markdown链接检查0issues，exit0；日志 `production-docs-delivery-working-tree-precheck.log` SHA256 `988437e2a786f1f984328d2d42dbe21d3f8771595cfb90680e44f30f4ab5bc4d`。这只是未提交预检，不覆盖55e正式FAIL，也不是新head正式Delivery。

`npm run governance:write` 152tasks/0violations；`npm run lint` exit0（含governance/features/Markdown等），`git diff --check` exit0。其他151task和36feature对象相对生产base逐项相同、产品/版本/checker源码无diff。正式新head的Delivery/独审/Hosted仍待root提交后运行；文档实施者没有操作Provider或浏览器，root的真实验收另见下节。

## 实际图文与状态

用户确认Key填写并自行保存后，root在正式 `https://kkai.plus/mobile/`、Web2.1.39/source9d10/Mobile2.1.4、实际140201生产入口，430×637手机尺寸浏览器完成验收。连接 `838f0a11-8087-4b81-8e6d-5e351d2706e3` / origin `https://new.12ai.org`，模型健康GET200、73模型；不记录Key。

| 实测范围 | root实际收据结果 |
| --- | --- |
| 短文本 | 仅1次真实 `gpt-4.1-mini` POST，HTTP200 SSE、finish_reason=stop及[DONE]完整结束；任务 `f5dae4e6-0309-40fb-98dc-e68b5f4cd69f` 刷新前后均1/1 succeeded terminal，正文恢复，文本SHA256 `1fffc1d3666ab85d970314222001703889db4615ef9513dddeb57c0791c9a1ce`一致。 |
| 单图 | 仅1次真实 `gpt-image-2` POST，n=1/response_format=b64_json，HTTP200，有base64、无远端url；PNG1024×1024、830,495 bytes。任务 `4a4ecc05-5d1f-47ce-af40-c8ac49252cc9`、素材 `asset-64a6af6eb696b0dd87362e81` 自动归档，刷新前后1/1 succeeded terminal且同ID；Provider字节与两次普通UI导出SHA均 `64a6af6eb696b0dd87362e814df773ca85c940b715aed254564df34571c4aa13`。 |
| 刷新与费用边界 | 完整network记录truncated=false、pausedEvents=0，文本POST1/图片POST1、视频请求0；首次刷新后Provider请求0、POST0。页面/资源/本机blob的GET不是新生成，不把刷新总事件数当Provider请求数。上游未报告实际计费或图片请求ID，不虚构费用、退款或图片上游ID。 |
| 旧资料 | 旧文本 `26ff4e90-eb8c-49e6-984f-b1919d67795a` 仍1/1 succeeded；旧失败图 `64c15f3c-b06d-4cad-93af-700c98859d23` 仍0/1 unknown，未重试或删除。旧导入原件 `asset-3748344ca1401ce802fcc96e` 754,926 bytes，SHA `3748344ca1401ce802fcc96e7cea295a077cc7e9e02064c8c22ff8125441e9e8`与基线相同；最终2项目/2原件/1连接、快照53。 |

root现场收据完成于2026-10-18T07:55:28.150Z，状态 `PASS_WITH_EXPLICIT_SCOPE`；工程外 `acceptance/live-acceptance-receipt.json` SHA256 `62a08874a33775966baf958ab98341727571d7d35f5e370d4baf36c35ee94b3a`，`acceptance/live-network-complete.json` SHA256 `f5961ecb278fc3a1a611965bb1724e473fb2396c460cc48fcaa3559844eff391`。它们是本轮真实验收，不替换旧55e的“待Key”或旧CORS失败时点记录。

证据勘误与补录：原增量AX的no-change快照不足以独立证明完整页面，现保留并补齐7份 `*-full-dom.txt`；旧import原件由普通UI再导出，754,926 bytes/SHA3748344c与基线相同。`live-network-complete.json` 的beforeRefreshCursor未在刷新边界冻结，不能用其与finalCursor同为459推断前进；按刷新前request ID集合差集，首批15条、补录后34条均GET，Provider0/POST0、无截断/Fetch暂停。`acceptance/live-readonly-supplement.json`（08:00:30.911Z）SHA256 `706ea3b3f1d8bee16b20829aadd7bd4025ac9198305875d2085a3f561bc3b204`，保留原件与勘误。

另一上下文 `/root/production_live_receipt_review` 于08:02:00.735254Z对27个冻结输入作独立离线复核，`PASS_WITH_EXPLICIT_SCOPE`、无blockers：`final-review/live-production/review.md` SHA256 `8730b185a4395b2363b627cf4d2cc324894fd3126a3272bc560824b34a0ff2f0`；`review.json` SHA256 `59af4671f7618f14b69b3fa5458a3f93051b12d0fdfcfcf8486763771d126ae3`。独立重算两导出PNG签名/尺寸/长度/SHA、正文UTF-8 SHA、三旧记录/原件与基线、完整DOM及请求ID差集；这属于已捕获生产证据审查，未再操作浏览器或Provider，不冒充第二次实测。SSE与b64来源为执行者脱敏收据。

## canonical 最终只读观察

07:30/07:31的0a49/index7dc72867、4dirty及两读稳定为历史阶段，初始基线比较FAIL继续保留。08:02:17.6200270Z的 `protection-final-live-acceptance.json` SHA256 `3eafe28a8cd6bcb97a589a572823b40e031618f336f27e12cb01803087f6d7df` 只读显示canonical HEAD `208f97de08219b19f095ddc0c03031c38e7cd1e1`、index SHA `2717ed9da5f6b7ac3f4c07e9ec5012bd53d9ee2ff2d0fa77dfa52169068a2da8`、status为空，四条原并发路径bytes/hash均与07:31不同。不能称最终4dirty稳定或canonical未变；本轮未对canonical写入、还原、stage或commit，不归因操作者，隔离生产source9d10不包含这些后续变化。旧release树0cb的clean/index不变只按较早核对时点记载，最终收据未重新核对它。

现场图文技术实测及独立live证据review有界PASS；TASK-MOBILE-12AI-001保持REVIEW/NOT_VERIFIED，最终文档head的正式Delivery/独审/Hosted待提交后执行，另冻结工程外收据及PR记录，不为自引用head或未来CI循环改写本包。FEAT-028仍PARTIAL、T12仍TODO/open；真实上游视频未调用，视频仅本地fixture保存/播放/导出/刷新PASS。Safari/实体设备/新Native包/真实视频计费等不在本次实测结论内。canonical基线比较FAIL及并行变化边界保持，不能因线上验收成功改写保护结论；用户确认保存Key不等于已给出本轮最终产品接受。
