# ADR-020：项目生命周期保存在现有创作快照

- 状态：ACCEPTED（实现进行中，未发布）
- 日期 / Task ID / Owner：2026-10-15 / TASK-KK-UNIFIED-20261015、TASK-PROJECT-SIDEBAR-001 / root
- Intent / Spec / Plan：[批准规格](../../changes/2026-10-15-kk-unified/spec.md)、[实施计划](../../changes/2026-10-15-kk-unified/plan.md)
- 决策依据与授权范围：用户要求两处项目操作一致、持久分组、手动名称保护和项目垃圾箱；现有文件夹具有删除后恢复入口，保留其行为。
- 替代/被替代的 ADR：无；延续 ADR-019 的统一仓库和稳定身份边界。

## 背景和约束

CreationSnapshot version 2 是项目、画布、任务及草稿的既有持久源；侧栏文件夹此前仅会话保存，项目删除直接过滤整个记录。素材编码和项目包遍历 projects，另建垃圾箱数据库会分裂引用闭包和原子保存边界。原生快照与项目包使用严格白名单，新增字段必须同步校验。

## 方案比较

| 方案 | 取舍 |
| --- | --- |
| localStorage 单存分组，另存垃圾箱副本 | 多处权威无法随项目一起保存、冲突及导出，不采用 |
| 立即迁移新数据库或整套事件流 | 非本阶段必要条件，扩大旧数据迁移风险，不采用 |
| 在现有快照兼容增加生命周期元数据 | 沿用 revision/CAS、编码和包引用闭包，采用 |

## 决定

- 项目增加可选 nameSource（auto/manual）、groupId、trashedAt；projects 原位保留软删除项目的全部内容。普通列表、搜索和启动选择排除垃圾箱，恢复沿用原 ID、画布、聊天、任务和素材关系。
- 快照增加可选 projectGroups。分组顺序由数组表达，成员以 project.groupId 表达，不另存相互矛盾的成员列表。旧项目缺少 nameSource 时保守视为 manual，新自动项目显式标为 auto。
- 删除分组清除所有项目的该归属，保留 deletedAt 以延续现有恢复文件夹入口；恢复为空组，不抢回已被重新分组的项目。分组恢复不是作品垃圾箱或物理文件回收。
- 两处 UI 共用生命周期动作及项目菜单。保存未就绪、冲突、写入失败和仍未结束任务时沿用现有保护，提供真实原因；不为软删除而取消远端任务或删除原件。
- Native、TS codec、包导入导出均校验新增字段和引用关系；资产引用仍遍历包括垃圾箱在内的所有 projects。无字段旧数据兼容读取，未知格式和无效成员关系显式拒绝，不能忽略字段再覆盖。

## 迁移、恢复与退出

不更改数据根、项目 ID、assetId、credentialRef、存储 key 或快照 version。旧版本可能不理解新增字段，严格读取应拒绝而不是静默丢字段。跨版本写入能力协商仍由后续统一仓库阶段实现；本阶段不能宣称任意旧 Web 客户端都可安全混写新仓库。

更新通过现有保存队列和 revision 检查提交，失败保留待保存状态及恢复草稿；垃圾箱内容继续参与备份和引用检查。本阶段不物理删除文件，不增加自动清理，不移走其他目录。未来多聊天继续在同一项目契约内扩展。

## 验证和接受条件

纯函数及 codec 验证旧项目、手动名称、分组删除/恢复、项目软删除/恢复和未完成任务保护；Native 保存与项目包真实往返验证元数据和垃圾箱原件。浏览器检查两处操作、菜单点击不打开项目、刷新后分组/名称/垃圾箱不丢。实际 Native、独立审查与当前提交测试后才能标记相应实现完成；总任务仍有后续阶段。

## 2026-10-18 扩展：同一快照的侧栏偏好

Task TASK-SIDEBAR-CANVAS-20261018 / root；ACCEPTED、本地实现已验、未发布。上文version2与“未来多聊天”为2026-10-15决策时的历史背景；当前原库已为canonical snapshot3、repository format2，保留原creation-v2.json文件名与身份，不再次执行旧迁移。

置顶与排序属于本地项目库视图偏好，采用可选sidebarPreferences（sortMode=manual/recent/priority、pinnedProjectIds、pinnedGroupIds），随现CreationSnapshot V2/V3和revision/CAS保存，不另设localStorage权威或数据库。原有手动顺序仍沿快照数组；本轮未新增自由拖动重排。旧快照缺字段只在UI采用manual/空pin，不为填默认值重写资料。

TS normalize/codec、Native及项目包均拒绝未知偏好键、非法/重复ID和悬空引用；引用闭包包括trash/deleted记录，软删和恢复保留pin。快照其他opaque恢复字段保持原样。useProjectLibrary现生命周期动作/commit/flush为唯一写入口，存储未就绪或冲突时禁用修改；写失败保留待保存状态和原件，不假报saved。

项目包只支持完整恢复到新的隔离root，保留原ID/偏好，不提供合并/remap或覆盖当前库。现有安全/原子保存边界、数据根、密钥引用和repository能力协商不变；不能推导任意旧客户端可混写。验证覆盖旧缺字段、V2/V3、非法引用、opaque、失败/CAS、软删恢复及真实Native新root包往返；Web重载与fresh官方Native正常重启均证明pin/sort保持。精确证据见[本轮验证](../../changes/2026-10-18-sidebar-canvas/verification.md)。
