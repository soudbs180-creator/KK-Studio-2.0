# Verification：Git pre-push 路径兼容

- Task：TASK-FIX-PUSH-GUARD-SPACES-001；PARTIAL，未合并。
- Base：PR #47 `0f663222addc22b08dc083c8cfd506e22ebe7971`；main 核对 `7ebf143b291e344b243e1ef396d510bb91730bd3`，相关源码/测试/依赖/CI 相同。
- 环境：Linux、Node v24.19.0、npm 11.9.0；同 lockfile 已安装依赖用于隔离 worktree，Agent/plugins 已实际构建，不改 lockfile。
- 源码指纹、退出码及原始日志校验值：[manifest](evidence/manifest.json)。日志为无损 gzip，失败原件保留。
- 关联：[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。

## 实际检查

| 检查 | 结果 | 证据和边界 |
| --- | --- | --- |
| 原 hook 基线 | 9/9 PASS | 真实本地 bare remote |
| RED 启动/升级 | 25 total：18 PASS、7 FAIL | [失败](evidence/red.log.gz)；Linux 六个真实路径用例修复前已通过，不冒充 Windows 复现 |
| RED 符号链接升级 | FAIL | [失败](evidence/red-symlink.log.gz)；先复现错误接受 symlink，再修复拒绝覆盖 |
| 新旧全部 hook 回归 | 26/26 PASS，0 skip | [GREEN](evidence/green-final.log.gz)；六个真实路径用例、拒绝规则、升级、工作树与启动边界 |
| 最终 root suite | 829 total：823 PASS、0 FAIL、6 原有 skip | [verify 前半段](evidence/verify.log.gz) |
| lint/typecheck/format/UI check | PASS | [lint](evidence/lint.log.gz)、[typecheck](evidence/typecheck.log.gz)、[format](evidence/format.log.gz)；治理117/0、功能37/0、UI214/0 |
| npm run verify | FAIL，退出1 | [日志](evidence/verify.log.gz)；Agent tsx CLI 创建 Unix IPC 被环境拒绝 EPERM，后续未执行 |
| Agent Node loader 等价尝试 | 174 total：171 PASS、3 FAIL | [日志](evidence/agent-test-loader.log.gz)；不代填通过，失败见下方 |
| npm run test:ui -- --max-failures=1 | build PASS；浏览器 FAIL，退出1 | [日志](evidence/browser.log.gz)；缺少 `/opt/microsoft/msedge/msedge`，4启动失败、443未运行，另1非测试错误 |
| 实际 common hook 安装/升级 | PASS | 默认安装拒绝旧版；显式精确v1升级留存备份，再次安装幂等，未设置 core.hooksPath |

隔离工作区初次 root suite：804 PASS、2 FAIL、6 skip。`Agent configuration never saves a generated connection secret without environment credentials` 和 `desktop Agent waits for its owner, authenticates readiness and clears on owner disconnect` 缺少 Agent dist；构建后最终 root suite 两项均通过。[基线失败](evidence/baseline-test.log.gz)保留。

Agent loader 尝试三项失败均在未修改模块内：`only an existing absolute CodeBuddy script can be selected` 在 Linux 对路径产生不同错误文案；`MCP exposes a bounded CodeBuddy consult tool and returns its real result`、`cancelling an MCP consultation stops the CLI and frees the next call` 的子进程仍触发 tsx IPC EPERM。未弱化断言或把这些失败隐藏。

## 平台与交付边界

- Linux：真实本地 bare remote，单级空格、多级空格、超过260字符路径，各自合法创建/快进及非法main/非快进，保护规则、工作树与升级已实跑。
- Windows：新增 `git-guards` Windows/Linux Hosted 快速回归；原生结果尚待回读，不能以 Linux 启动替身或 PR #47 的旧 CI 代填。
- `scripts/governance/push-policy.mjs` 与 main 原文件相同；没有关闭保护、强推共享分支、合并或发布。
- 本PR依赖 #47；其默认 squash 合并后，从最新main承接本任务提交、保留 #46/#48 并发审计记录，重新验证与审查。不得仅改base声称已去重。
- UI、真实Provider、应用安装包不适用本次开发工具修复；完整仓库 Agent/浏览器门禁以当前Hosted回执为准。
- 独立精确候选审查、Windows Hosted、完整 Hosted 与最终main承接未完成，任务不标DONE。

## 独立审查后修复

原候选4712d5a独立审查发现PUSH-REVIEW-001/P1：umask剥离升级钩子执行权限。[RED](evidence/red-umask.log.gz)真实main推送意外成功；修复后[27/27 hook](evidence/green-umask.log.gz)、[824 root PASS/0 FAIL/6 skip](evidence/test-final.log.gz)、[lint](evidence/lint-final.log.gz)及typecheck通过。此前26/26、823/0/6属于原候选，保留原义；最终源码指纹见[manifest-final](evidence/manifest-final.json)。原完整verify/浏览器环境边界不变，未声称全绿。

## Windows首轮失败及夹具修正

当前72e2b84a的[Hosted首轮](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38022126249)为Windows15 PASS/7 FAIL/5 skip，Linux27/27 PASS。新增fixture用Node `os.devNull` 的Windows设备路径作为Git配置路径，Git init拒绝该路径，七项都未执行到hook；[原日志](evidence/windows-first-failure.log.gz)、[失败元数据](evidence/windows-first-failure.json)保留。改用现有policy fixture同款 `NUL`，不删减或放宽任何断言；修正后本地Linux27/27 PASS，新Windows结果待当前head回执，不能将首轮标为通过。
