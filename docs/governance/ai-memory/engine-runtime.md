# 运行引擎与硬件调度专项思维链（Engine & Hardware Runtime Thought-Chain）

> 领域：超级 AGI 终端、硬件自适应（VRAM/RAM/GPU）、本地模型动态匹配与生命周期管控
> 适用：当开发或调度本地模型、硬件探测、显存防爆或 AGI 终端架构时，AI **自动且仅**加载此文件。
> 详见宏观设计规范：`docs/architecture/SUPER-AGI-TERMINAL-HARDWARE-ADAPTATION.md` 与 `docs/architecture/AIG-SWARM-RELAY-ARCHITECTURE.md`。

---

## 1. 核心意图与架构基准

1. **超级 AGI 终端（Super AGI Terminal）**：
   - 用户唯一交互入口。无论是在创作画布（Studio Runtime）还是在研发重构软件（Meta-Dev Engine），面对的都是同一个终端中枢；
   - 彻底屏蔽低阶配置（Q4/Q8、CUDA 参数、显存水位线），由 Agent 自主探测并适配最优解。
2. **硬件自适应本地模型矩阵**：
   - 底层由 `src-tauri/src/local_hardware.rs` 探测硬件（GPU 专用显存、空闲显存、系统内存、计算平台）；
   - 消费 `src/domain/localModelRecommendations.ts` 的推荐规则，划分三档算力阶梯（<8GB 轻量蒸馏、8-16GB 黄金主力、>=24GB 满血旗舰）；
   - **动态显存哨兵（VRAM Guardian）**：保留 2GB 专用显存给操作系统；大模型与生图模型采用「用完即卸载」的生命周期交替，杜绝 OOM 闪退。

---

## 2. 专项决策与留痕记录（最新记录追加于此）

### [2026-11-06 19:25] 超级 AGI 终端与硬件自适应架构立项落位
- **执行 Agent**：Antigravity (Gemini 3.8 Flash High)
- **事实与依据**：
  - 响应 PO 指令，将本地模型与硬件调控确立为核心战略方向；
  - 固化双态终端架构（创作态调度本地最优模型与外部软件；研发态全权自治编码闭环）；
  - 正式发布架构白皮书 [`docs/architecture/SUPER-AGI-TERMINAL-HARDWARE-ADAPTATION.md`](../architecture/SUPER-AGI-TERMINAL-HARDWARE-ADAPTATION.md)；
  - 本地硬件探针与推荐模型已在 `local_hardware.rs` 与 `localModelRecommendations.ts` 具备完备类型与测试。
- **移交待办 (Handoff)**：
  - 下一步将推荐算法与桌面原生任务宿主（TaskHost）连线，实现模型加载前的动态显存预检与无感降级。
