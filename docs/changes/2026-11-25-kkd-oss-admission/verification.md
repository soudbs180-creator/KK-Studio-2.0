parent: TASK-KKD-OSS-ADMISSION-EVIDENCE-20261125

# 开源准入验证

- 基线 `e4383a1e323c895286d9f08fe901a27e341a10da`。首轮实现 `159f749d0053e135615c67ad4e95804994063693`，最终候选源码 `7f8e4ab100ec19270312700f8287a7fa0c0866a3`。
- `node --test tests/unit/ossAttributions.test.ts` 新增的文件覆盖与许可文本案例修复前失败，23 通过、2 失败。修复后 25 通过。定向 ESLint、Prettier 与 `npm run governance:check` 通过，扫描实际组件 3 个、违规 0 项。
- 隔离 Git 副本以官方三项 vendor 原件运行。基线通过。改动已跟踪 `canvas-proxy` 文件和增加未忽略文件分别拒绝。候选工作树 `npm ci --no-audit --no-fund` 完成，Git 中 vendor 原件干净。
- 既有 `canvas-proxy` 对照使用上游参考 `e6d0911e9d509d00150eaab02f9ca05be94ffc46` 与官方 `e4383a1e`，实际运行两侧 CLI。在环回连接验证路由识别、请求转发、预检、上游错误与 SSE 五项。收据 `.tmp/output/2026-11-25-kkd-evolution-phase1/oss-canvas-proxy/proxy-parity.json` 的 SHA-256 为 `23606d4ce49e9b83fcc31374ac9e4fc10f02aa2a665c01a6df5df7ade2f7b7f9`。历史组件整体仍为 PARTIAL，待核对精确来源、整个产品及真实供应商。
- 原始命令记录存放于忽略目录 `.tmp/output/2026-11-25-kkd-evolution-phase1/oss-admission/`。正式提交的本地门禁、独立审查、Hosted 和集成结果由协调台账分项记录。
