# Spec：Kaworkai 无限画布交互研究与 KK 本地画布增强

- Task ID：TASK-CANVAS-KAWORKAI-001
- 状态：IMPLEMENTED（定向验证；既有空项目 fixture 的全量画布回归仍单独记录）
- 日期：2026-09-29
- Intent / 账本：`intent.md`；`docs/governance/task-ledger.json`
- 当前规范与实现基线：`docs/UI_INDEX.md`、`docs/DESIGN-SYSTEM.md`、`docs/UI_RULES.md`、`src/components/Canvas.tsx`、`src/domain/projectCanvas.ts`
- Source of truth：本地代码和现行 UI 规范；参考站点只作为交互研究输入，完整观察见 `research.md`。

## 用户行为与入口

- 主流程和相邻流程：在画布添加/移动/删除节点或连线；在右键菜单执行撤销/重做、切换网格吸附和打开图层管理；图层面板搜索并定位节点。
- 页面/route/组件或 API/命令入口：`Canvas` → `useCanvasControls` / `useCanvasConnections`；`CanvasToolbar` 的帮助菜单；`CanvasContextMenu`；新增 `CanvasLayersPanel`、`useCanvasHistory`、`useCanvasPreferences`。
- loading、success、error、cancel、offline、timeout：本轮均为同步本地 UI 状态；偏好读取失败回退默认值，写入失败不阻断画布；历史栈为空时控件禁用；面板关闭/取消不改变数据。
- 重试、幂等、stale async、unknown 受理与重启恢复：历史恢复按快照指纹去重，撤销/重做不产生新的历史项；项目快照仍由既有 `useCanvasPersistence` 写入。
- 键盘/焦点/Escape/IME、长文案、响应式：Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z、Ctrl/Cmd+Y；输入框、菜单和 IME 合成不拦截；Escape 关闭面板/菜单并恢复触发按钮焦点；图层面板在窄画布仍可滚动。

## 架构、数据与权限

- 模块职责和依赖方向：领域层提供历史快照纯函数；组件层 hook 观察画布状态并应用快照；UI 层只消费 callbacks；不新增 provider 或远程状态源。
- schema/API/事件/文件格式与兼容策略：`ProjectCanvas` 版本保持 1；历史只在当前挂载会话存在，不改变项目快照 schema；偏好 key 为 `kk-canvas-ui-preferences-v1`，无效 JSON 回退默认值。
- 数据归属、原件保留、校验和、并发/原子性：项目快照仍由宿主拥有；历史保存内存深拷贝；偏好仅为非敏感 JSON；恢复前后以指纹判断，避免重复入栈。
- 凭据与日志边界、外部传输与费用：不读取凭据、不发起外部请求、不触发模型或积分。
- 相关 ADR：无需新增 ADR；不改变跨模块持久化 schema、权限或 provider 协议。

## 平台能力

| 能力              | Desktop                    | Web                        | Mobile              | 降级/禁用理由                  |
| ----------------- | -------------------------- | -------------------------- | ------------------- | ------------------------------ |
| 画布快照撤销/重做 | 真实前端能力，沿用项目快照 | 真实前端能力，沿用项目快照 | 浏览器窄屏同一前端  | 无                             |
| 网格吸附偏好      | localStorage 非敏感设置    | localStorage 非敏感设置    | 浏览器 localStorage | 存储不可用时回退默认并继续工作 |
| 图层搜索/定位     | 真实前端面板               | 真实前端面板               | 可滚动面板          | 本轮不提供分组/网格视图        |

说明：本轮没有远程生成或费用能力，所有新增能力都属于本地真实交互；Web 与 Desktop 的原生存储差异不改变画布数据契约。

## 生命周期与恢复

- 初始化/安装：第一次挂载使用默认偏好；读取到合法 v1 偏好则恢复。
- 正常使用、取消/离线：移动、连接、增删和表单编辑进入历史；面板关闭和偏好切换不进入历史；无网络不影响。
- 升级和旧 schema：项目画布版本继续为 1；偏好未知版本丢弃并回到默认。
- 损坏/写失败/进程重启：localStorage 解析或写入失败只影响偏好；项目快照按既有损坏保留策略处理；历史栈在重启后清空。
- 备份、还原、回滚：撤销/重做只作用于当前会话；项目快照由现有保存回调持久化，可通过项目恢复机制回滚。
- 导出/卸载/退役及用户数据保留：不新增导出字段；偏好 key 可随应用清理策略删除，不含用户原件。

## 验收映射

| Intent AC | 预期状态/结果                  | 检查/运行环境      | 证据要求                  |
| --------- | ------------------------------ | ------------------ | ------------------------- |
| AC-1      | 节点/连线/移动可撤销与重做     | Chromium，画布项目 | Playwright + 单测         |
| AC-2      | 菜单动态状态与焦点稳定         | Chromium，右键画布 | Playwright                |
| AC-3      | 吸附可切换且 Ctrl/Cmd 临时绕过 | Chromium，拖动节点 | Playwright                |
| AC-4      | 图层搜索/定位可见且不改数据    | Chromium，面板打开 | Playwright DOM/截图       |
| AC-5      | 原有几何与构建门禁无回归       | 1421 Vite / build  | typecheck、定向 UI、build |

## 风险和决策

- 可自主解决的技术决定及依据：不扩展现有 ProjectCanvas schema；快照 history 只在 Canvas 容器中组合，避免第二套项目状态源。
- 待用户决定的产品语义：无。
- 规范冲突、外部依赖与阻断范围：工具条和导航存在现行像素门禁，因此新增入口不得改变其外框尺寸；用既有菜单和浮层承载。
- 与 intent 的差异及授权依据：未调用任何外部生成能力；研究和本地基础交互符合授权。
- 明确未承诺的能力：竞品的 AI 工具、服务端协同、积分/账号、分组折叠和多端同步。
