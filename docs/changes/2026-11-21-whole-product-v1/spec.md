# Spec：Desktop 整包 V1

- Task ID：TASK-WHOLE-V1-20261121
- 状态：READY
- 日期：2026-11-21
- Intent / 账本：[intent.md](intent.md)；task-ledger → TASK-WHOLE-V1-20261121
- 当前规范与实现基线：[PROJECT_GOALS.md](../../governance/PROJECT_GOALS.md)、[BACKEND-ROADMAP.md](../../features/BACKEND-ROADMAP.md) Wave 0、[UI_INDEX.md](../../UI_INDEX.md)、[DESIGN.md](../../../DESIGN.md)
- Source of truth：能力归属以 [scope-map.md](scope-map.md) 为准；功能成熟度仍以 `features.registry.json` 为准（本包不把未终验项偷偷改成 REAL）

## 用户行为与入口

### 主流程（V1 必须）

1. 用记录在案的日常 Desktop 入口启动。
2. 创建或打开项目。
3. 配置/连接至少一条文本与图片通道（Key 或已登录 Agent）；健康状态可见。
4. 一次文本生成：见 loading → 成功结果（或可理解失败）。
5. 一次图片生成：结果进入画布/素材，原件可追溯。
6. 至少一次取消或失败、一次离线/断连类提示（能复现则必测）。
7. 完全退出后重开：项目、结果仍在。

### 相邻流程（V1 抽查）

- 设置中保存 Provider/网络相关非秘密配置；错误有提示。
- 侧栏进出项目无死路。
- Prototype 入口（账号/积分/视频等）有标或禁用原因。

### 状态要求

主路径异步操作覆盖：loading、success、error、cancel、offline（适用时 unknown）。  
UI：无死按钮；矮屏主操作可达；颜色/状态走语义令牌；以用户走查为准。

## 架构、数据与权限

- 不新建第二套任务队列或存储；沿用 TaskHost / 创作快照 / 素材仓库现行契约。
- 凭据不进 localStorage、项目导出、URL、日志。
- 演示 seam（FEAT-025）不得与真实结果同态展示为已完成生成。
- 相关 ADR：ADR-011 平台顺序；ADR-019 本地仓库；ADR-012 TaskHost 文本；不在本包推翻。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| ---- | ------- | --- | ------ | ------------- |
| 整包 V1 跑通 | 必须 | 后置 | 后置 | Desktop → Web → Mobile |
| 最小文本+图片链 | 必须真实 | 不纳入本包完成 | 不纳入 | Wave 0 |
| 画布+素材 | 抽查已 REAL | 同共享核心 | 后置 | 勿重做 |
| 账号/积分/视频 | Prototype 标明 | 同左 | 同左 | 不进 V1 跑通 |
| 云同步/VPS | 非必须 | 以后 | 以后 | 本机优先 |

## 生命周期与恢复

- 初始化：日常包可启动；版本身份写入 verification。
- 正常使用：主流程上节。
- 取消/离线：可见原因，不静默清空项目。
- 重开：同项目结果可恢复。
- 本包不要求：跨大版本自动迁移、签名安装器全矩阵、干净机首次安装（记为已知限制除非挡你日常使用）。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --------- | ------------- | ------------- | -------- |
| AC-1 | 范围表完整 | 文档 | scope-map + 本 spec |
| AC-2 | 主路径通过 | 日常 Desktop | [walkthrough.md](walkthrough.md) 勾选 |
| AC-3 | UI 过关 | 同左 | 走查记录；截图可选 |
| AC-4 | 演示不冒充 | UI + 地图 | Prototype/禁用 |
| AC-5 | 基线可回指 + 迭代规矩 | 文档+SHA | verification + [iteration-rules.md](iteration-rules.md) |

## V1 算进 / 不算进（冻结）

**算进：** scope-map「已计入」+「补缺口后计入」在缺口关闭且用户终验通过后。  
**不算进：** scope-map「演示/以后」全部；Web/Mobile 整包；全供应商付费矩阵；Comfy 真机全链。  
**收口期禁止旁路：** 新开 Mobile/发布大修/规则重构/统一大包；解冻须用户明确同意。

## UI 过关标准（主路径相关）

1. 可见控件有行为或禁用原因。  
2. 异步有加载与结果/错误。  
3. 主按钮在矮屏仍可点。  
4. 无大面积错态空白或遮挡导致无法完成主流程。  
5. 不引入未注册硬编码色作为新主路径样式（既有基线例外不在本包清理）。

## 风险和决策

- 可自主：搁置旁路 nextAction；地图四桶分类；走查单结构。
- 待用户：整盘是否通过；是否解冻某旁路。
- 明确未承诺：本包文档日不等于产品 REAL 升级；未终验不得宣称「项目已完成」。
