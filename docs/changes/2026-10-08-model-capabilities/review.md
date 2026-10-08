# Review：模型能力声明

- Task ID：TASK-MODEL-001；技术补审PASS（head71ddb625）；最终文档HEAD增量补审另绑；历史6da9920e/2797687c结果保持原SHA；日期：2026-10-08。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md)。
- 当前目标基线：origin/main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232；集成提交577ed3ee，主checkout目前同一main SHA且clean。本任务仅写隔离候选。
- 实际 GitHub 审批、用户产品验收、合并与发布分别记录，不由技术检查代填。

## 首轮独立审查（保留历史 SHA）

- 时间：2026-10-08 13:55，Asia/Shanghai。
- Base：21d121d2b884b2b7ced4a98eb0e03c590de5c3cd。
- Head：0d20696eed73a4c8f8710dadb0b911700baf0751。
- Reviewer：独立只读 Codex 上下文 model_capability_review；调度工具指定 gpt-6-astra，reviewer 自报 Codex/GPT-6、部署型号未暴露。未派二级代理，未修改源码。
- 规则：上述 head 的 AGENTS、AI_RULES、DEVELOPMENT、REVIEW，按 requesting-code-review 工作流检查实际 diff。
- 结论：CHANGES REQUIRED；没有发现 P0/P1，一项 P2 阻断 AC-4 技术验收。

独立重跑四个相关单测文件 29/29 PASS；逐项重算 381 个源码指纹，无差异；EXE/dist JS 与原生记录相符。抽查完整 verify4、client-check、fresh Tauri 日志及 runtime，支持 Node 645/653、Agent 172/174（原平台 skip 保留）、browser 381/381 且无 flaky。抽查 390px 设置与 native 重绘禁用截图。

## MC-001：参考图预校验与实际附件数量不一致

- 严重度：P2；pass：行为与 UI；阻断本任务 AC-4 及无条件合并结论。
- 位置（首轮 head）：CreationComposer.tsx:89、CanvasImageCommand.tsx:59、ImageRedrawDialog.tsx:12；对照 imageTaskCommand.ts:321。
- 条件：原图与一个连线节点共用 assetId，限额 1 时实际附件去重为一张，而普通 UI 会重复计数；原图加另一张连线参考图、限额收紧至 1 时，重绘窗口遗漏 incoming，直到 prepare 才拒绝。
- 影响：合法编辑被误禁，或超限编辑未提前给出正确禁用说明。底层门禁有效，未发现超限 HTTP 或任务受理绕过。
- 负责人：TASK-MODEL-001 实现者；当前状态：CLOSED，2026-10-08 15:02由同一独立上下文对新base/head复验关闭，见下方收据。

接收审查后先核对实际归档逻辑。图边单测确实复现了同素材误拒；浏览器准备先修正恢复时卸载保存竞争、动态 first 定位器和未知模型绑定，保留这些失败记录。稳定真实控件回归复现了不同素材超限时重绘仍 enabled，未删验收断言。修正将归档素材去重、源图存在判定用于普通生成、重绘、连线和附件读取；非图片、未归档与悬空引用保留失败关闭保护。参见 verification 的 RED/GREEN 与最终集成记录。

## 首轮未评定范围与裁决

- 真实付费 Provider、实际 mask/outpaint、原生 Mobile 不在本轮范围，fixture 无法证明。
- Vite development public-plugin import 已在原 main 复现并登记 TASK-PLUGIN-DEV-001；它不阻断 production 能力功能，但 Esc 后局部表单通过不能替代开发插件完整验收。
- 新 main@5b0eb6a 集成结果不在首轮固定 SHA 内，需新 base/head 补审。没有把首轮 PASS 范围改写到新提交。
- 原始日志尾空格是审计数据，未作为源码缺陷清理；正式 source/document diff 另行检查。
- GitHub 身份审批、公开上传授权、用户最终产品验收和合并发布不由独立技术 reviewer 代填。

## 实现者自审与当前候选

账号/完整 model、false/zero/未知、文本/Codex隔离及任务数量与 HTTP 分块契约保留。最新主线的 native intent/回执恢复和显式重试逻辑保留；本修正不迁移项目/素材/凭据、不复制 ArtCraft 产品代码或目录，不新增依赖/CSS。

定向单测 28/28、六项 capability 浏览器诊断通过；该浏览器诊断明确使用 1425，只证明本文件的 fixture 范围，不能替代仓库规定的 1423 全量验收。标准端口自然释放后，5b集成轮完整verify已通过；又融合新main@5dd6e6dd，最后源码完整verify723/731root、172/174Agent（原skip保留）、406browser无flaky、clientcheck、fresh Tauri/隔离运行全部通过。上述实现者自审当时尚待新head独立复核，随后取得下方固定SHA收据，旧review不套用新SHA。

## 最新集成提交的独立复验

- Base：5dd6e6dddaf00cf2d5c14ae02ef5974c72238232。
- Head：6da9920e77bb569cd0041dc0c65727292025fb61。
- 时间：2026-10-08 15:02，Asia/Shanghai；reviewer：原独立只读model_capability_review上下文，调度指定gpt-6-astra；自报Codex/GPT-6、部署型号未暴露。
- 结论：PASS；MC-001 CLOSED，无新增P0–P3 finding。工作树保持clean，未启动服务、构建、派二级代理或修改源码。

独立重跑七个相关单测文件87/87 PASS、0 skip，包含归档去重、非法原件、租约迟到变化、native回执恢复/unknown重试和保存队列。重算389个源码文件，全部匹配聚合指纹8e58bd273069b7f578f52943107f1d648a75593060d55f59cc698267fa1f2373；EXE及实际index-ByBcWj1e.js与native记录一致。抽查最新原始日志及六项capability浏览器记录，支持723/731root、172/174Agent（原skip保留）、406browser/0flaky与fresh Tauri结果；目视抽查390设置/native参数。本次浏览器与native是已提交证据复核，没有声称独立重跑全量。

复验确认普通生成/重绘传完整references、共享assetId只占一次、不同素材超限预禁用，hover和实际connect使用同一总量规则，edit=false没有被去重扩大权限。非图片、未归档、悬空引用继续失败关闭。App相对新main的差异只增加任务输出数量和native图片能力复查；上游intent/回执恢复/保存确认/unknown与显式重试保留。

真实Provider、实际蒙版/扩图和原生Mobile仍未评定；既有开发插件错误另记TASK-PLUGIN-DEV-001，不把Esc局部通过当插件通过。GitHub身份审批、用户产品验收、公开授权、合并/发布不由技术结论代填。此次补写review/状态文件仅为文档，最终head仍需增量补审；最终PR描述和交付收据记录准确SHA及Hosted结果，不能把本收据SHA偷偷替换成后续提交。

## Hosted日志后的追加调查与预审

原head2797687c的push/PR workflow均success，PR verify原始浏览器结果405pass+1flaky。重试通过不等于零flaky；原artifact的error-context只含失败按钮局部DOM，无法直接证明目录或源图状态。旧技术PASS是当时证据下的历史结论，本次增量另绑SHA。

- MC-003，P2，AC-1阻断：真实受控事件证明同账号/模型、持久目录未变时，provider-changed会因revision依赖将未保存edit=supported/maxReferences=1清空为未知。移除事件revision作为草稿重置依据，事件仍触发目录重读；新回归核对字段和实际保存目录。本地新32次定向、完整408及fresh native均通过，等待已提交HEAD的独立正式复验。
- MC-002，P2，dirty候选预审：删除revision后原reset函数涉及的family/variant/aliases未在依赖中。独立model_capability_review指出该遗漏；仅显示字段更新回归真实RED，随后补齐三项真实值依赖，新32次定向及408全量通过，等待独立正式复验。这个遗漏从未作为最终候选上传。

预审不把草稿覆盖bug冒称原Hosted flaky的唯一根因；本轮加强图用例保存结果、原图存在与非敏感fixture现场信息，保留原禁用断言，不增retry/timeout，不删验收。当前未完成的fresh产物、完整检查、精确提交独立审查与Hosted均不预填PASS。

## 草稿刷新修正正式独立补审：PASS

2026-10-08 16:31，Asia/Shanghai；reviewer为原model_capability_review独立只读Codex/GPT-6上下文。实际base5dd6e6dddaf00cf2d5c14ae02ef5974c72238232、head71ddb625e97f169b392c3903daa38fc26f3d3ae2，工作树clean。审查从本任务规则、需求和实际diff开始，未写候选、启动服务、构建或派子代理。完整结构收据见[review-product.json](evidence/draft-refresh5dd/review-product.json)。

MC-003 CLOSED：通知仍触发目录重读，revision不再充当草稿重置依据，身份/已保存值未变则保留未保存能力。MC-002 CLOSED：family/variant/aliases全部进入真实值依赖，身份/用途/尺寸/image真实变化仍刷新编辑状态。MC-001保持CLOSED：去重、计数、共享门禁与连接权限本次未改，相关单测及浏览器禁用断言继续通过。无新增P0–P3。

独立重跑七文件87/87、0skip；重算389源码hash全部匹配聚合2ebaab3d83bcf31fa33dbd94f8ee817b20baf5f1bf8661447beb64a5ac44735a；实际EXE db354e2bbd14f5891a5c1b6e3b5584e2f3576c0525b4aa86f50ebed0be4351c5、index-D7y589oD.js/8c39cd503fd883c447769915c20cf1c952e10fd3bb1134015b352c491e227829匹配。亲自读取两项RED、32定向无retry、标准1423完整verify及fresh native收据，支持723/731root(8skip)、172/174Agent(2skip)、408/408browser零flaky；没有声称独立重跑全量Web/native。

Declined to judge：原Hosted405pass+1flaky唯一根因仍UNKNOWN，新受控缺陷及本地通过不能倒推其唯一原因；新SHA Hosted待回读；开发插件完整验收、真实Provider、蒙版/扩图、原生Mobile、GitHub身份审批、用户产品验收和合并发布不在此次PASS范围。此后文档收口将单独审查准确新HEAD并在PR收据绑定，旧head不能直接替换为后续提交。
