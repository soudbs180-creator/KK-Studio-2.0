# Spec：项目落地与分支收敛

## 基线

- 基线分支：`origin/main`（2026-09-29 fetch 后 `1e95a13`）。
- 候选分支：`codex/TASK-PROJECT-001-landing-integration`。
- 当前未提交实现来自首页/对话 UI、Figma 四页治理和 Kaworkai 画布增强；先保存，再以主线能力冲突解决。

## 实现约束

1. 只使用 `src/styles/tokens.css` 及现行 UI 规范中的语义 token；不新增第二套颜色或尺寸规则。
2. 远端主线的 Canvas、asset storage、local companion、image compare 和 platform versioning 契约优先于旧候选的同名实现。
3. 空项目、无模型、离线、任务进行中、失败/取消和窄屏短高场景要有可读反馈；按钮不能静默失效。
4. 画布历史、吸附、图层定位只作用于本地已有节点和快照，不宣称竞品远程 AI/协作/积分能力。
5. 任何 `REAL` 或 `DONE` 变更都必须有对应平台的运行证据；缺失证据保持 `PARTIAL`/`BLOCKED`。

## Given / When / Then

- Given 最新主线包含新增功能，When 候选分支合并主线，Then 相关 import、版本、锁文件、功能卡和治理看板一致且可构建。
- Given 空项目或未配置图片模型，When 用户打开首页/对话，Then 输入区显示可操作的模型设置入口，提交按钮不会提交伪造任务。
- Given 平板 960–1200px，When 打开对话与画布，Then 对话 rail 和画布 HUD/工具仍可达，侧栏只在固定折叠宽度间切换。
- Given 画布已有本地节点，When 用户拖动、撤销/重做、打开图层面板或开启吸附，Then 快照、位置、选中态和偏好可恢复且不改动无关节点。
- Given 运行失败或 fixture 缺少素材，When 回归结束，Then 证据记录实际失败原因，不能通过删断言或生成空截图伪造成功。
