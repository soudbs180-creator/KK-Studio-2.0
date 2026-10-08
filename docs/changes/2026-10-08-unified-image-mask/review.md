# Review：统一图片编辑蒙版

- Task ID：TASK-IMAGE-EDIT-001；self-review PASS，正式独立 head 复验待追加。
- 2026-10-08，Asia/Shanghai；base 1af0357b088df79dc51e9b309ef310a500722cf8。
- 分支 codex/TASK-IMAGE-EDIT-001-unified-mask；[intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[verification](verification.md)。
- 独立预检：只读子代理 /root/mask_review，独立上下文从规则、需求、base/diff 开始，不承担实现。Codex collaboration；具体服务端模型版本未知，不虚构。

## 范围和发现

Dirty 预检结论 CHANGES REQUIRED，正式 SHA 审查之前的预检。以下修复已实现并由实现者动态检查；独立关闭结论待正式复验，不能把 self-review 改名。

| ID     | 严重度 | 问题                                      | 修复和当前证据                                                              | 独立状态   |
| ------ | ------ | ----------------------------------------- | --------------------------------------------------------------------------- | ---------- |
| IM-001 | P2     | 色块 pointerdown 即提交，第二触点不能取消 | 正常单指抬起才填充；brush/color 双指 PASS                                   | 待正式复验 |
| IM-002 | P2     | 拒绝首个裁剪审批留下 queued               | 审批拒绝走整组 cancel；两个 cancelled、0 请求、保留草稿                     | 待正式复验 |
| IM-003 | P2     | native union 丢失颜色编号定位             | 有色块保留标注图并算参考数；同色 A/B native PASS                            | 待正式复验 |
| IM-004 | P1     | native 包拒绝/漏收编辑字段与原件          | Rust schema/收集器、Web/native roundtrip 和实际桌面包恢复 PASS              | 待正式复验 |
| IM-005 | P2     | 删除预览来源节点卸载灯箱                  | App 承载灯箱；Desktop 删除源图、切候选、重新生成 PASS                       | 待正式复验 |
| IM-006 | P2     | 对账复活用户已删除候选                    | 保留归档输出/resultItemId 发布证据；单测和 EXE 重启 PASS                    | 待正式复验 |
| IM-007 | P2     | 连续编辑 prompt 超过 4000                 | 本轮不截断、有界上下文、过长提前拒绝；单测 PASS                             | 待正式复验 |
| IM-008 | P2     | retry/resume 绕过区域串行                 | 共用 group/controller/审批保护、finally queued 调度；全套任务/区域重试 PASS | 待正式复验 |

Self-review 另修 native 缺省 Option 写 null 导致元数据拒绝（RED→GREEN）；TaskHost/IPC 独立实例抢文件锁（真实重复生成 unknown→两次 succeeded）。保持严格文件锁与素材校验，不重复付费请求或生成假成功。

## 1527b48 正式复验（历史）

独立 reviewer 重新读取原需求附件、规则与实际 diff；base 78cea37af9359fd2d9f58f2854525516deee8a06、head 1527b481cf80499ae25f9136ad164dbe1a20f039，工作树 clean。独立 59 个定向 Node、Rust 3 项、typecheck 和 1437 production Web 的 11 个编辑用例无重试通过，IM-001–008 全部 CLOSED。新增 IM-009，使该 head 结论为 CHANGES REQUIRED；不能以初轮 self-review 或测试通过关闭。原独立收据在本机 output/unified-image-mask-20261008/review-1527b48.md。

| ID | 严重度 | 问题和复现 | 实现者修复及证据 | 独立状态 |
| --- | --- | --- | --- | --- |
| IM-009 | P2 | native 验收脚本缺少凭据 ownership；固定 provider 名+可复用端口可覆盖/删除已有 ID；吞掉 cleanup 失败且在 finally 前写 PASS | UUID provider、空值检查后认领、只清本轮 ID、删后读回、失败传播和必要重连；PASS 收据延后；2 项拒绝/删除失败单测 RED→GREEN，实际 OS 合成冲突原值保留及 cleanup=true | 待新已提交 head 复验 |

修复限于测试脚本与有意义的凭据安全回归，不改产品源码或版本。最新 Native 收据在 .tmp/image-edit/desktop/run-1791463594856-56968/，Mask 外改变 0、两次请求/包/删除再生/重启继续通过，cleanup 成功读回。完整 verify 741 root / 172 Agent / 420 browser 无重试通过。最终结论需绑定新 head，1527b48 的 CHANGES REQUIRED 保留。

## 门禁与结论

- 本地 lint/typecheck/root/Agent/UI/format/build/full browser、Rust/client/fresh EXE 与包恢复：PASS，见 verification。
- Self-review：来源不可变、坐标/Mask 外保护、能力/参考限额、串行/取消、unknown、恢复/删除、包完整性与敏感数据边界。
- 正式独立已提交 head 审查：NOT VERIFIED，待绑定当前 base/head 复核；预检不覆盖后续提交。
- GitHub PR/Hosted CI/人工审批：未执行；无合并/发布授权。
- 用户 UI/交互/产品验收：未发生，不由技术测试代填。
- 真实 Provider、Mobile 与语义几何检测：外部后续，不以 fixture 声称完成。

Head 变化需复核。此记录不代替推送、合并、发布或用户最终验收。
