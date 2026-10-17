# Spec：复用现有持久源和真实几何

- CreationSnapshot V2/V3兼容增加optional sidebarPreferences：sortMode=manual/recent/priority、pinnedProjectIds、pinnedGroupIds。缺字段只在UI视图默认manual/空pin，不自动重写旧数据；无第二localStorage源、不改repository身份/schema版本。
- TS normalize/codec、Native validator与项目包白名单都校验新字段：只接受已知键、合法唯一ID及引用闭包（含trash/deleted）。保留原未知恢复字段，不放宽现有安全检查；写失败或CAS冲突保持原件和待保存状态。
- useProjectLibrary.change/applyProjectLifecycle/flush为唯一写入路径，仍使用saved/saving门禁。pin/取消pin、三种排序在重载/正常重启后保持；软删/恢复保留ID及pin。组删除仍解除归属，恢复为空组。
- 项目包现为新隔离目录完整恢复，不新增合并/remap能力。偏好随原snapshot精确往返，源库不变；无效/重复引用拒绝。
- 保持现有UI、排序语义、键盘和窄屏入口。禁用未就绪/只读/冲突的偏好修改，错误沿用现有真实保存提示，不点击即冒充saved。
- 先复现宽图端点↔真实主体中点偏差，再最小修复共享几何；不凭旧命中PASS重复调整CSS。1200×300、21%/23.333333%/25%×折叠展开，真实拖线与SVG路径起终点/剪线按钮和端口位置对真实DOM核对；生成按钮仍可点，不实际提交生成。
- 先Web production，再fresh官方Tauri新隔离root复证侧栏创建/置顶/排序/重启、软删恢复/项目库一致及宽图六状态。官方EXE/source/input/loaded bundle必须相同；实际原库仅安全启闭/可编辑/历史保全，不拿用户资料做破坏测试。
- 全量verify、适用Rust/项目包、独立Spec/Standards、Delivery与任务事实同步后完成。本轮不证明真实Provider、新回复、Hosted、签名或发布。
