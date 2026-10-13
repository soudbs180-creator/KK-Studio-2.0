# Standalone checkout 快照门禁与 Actions 修复

任务：TASK-CHERRY-RED-001。日期：2026-10-13。实现前 HEAD：`20cb90c060b7499da06e7eb6177245140cb3e790`；下述本机结果绑定该 HEAD 加本次未提交脚本/测试/workflow diff，不代替最终提交的 Hosted 回执。

## 根因与契约

原 `scripts/check-snapshot-header.mjs` 无条件把仓库外 `CONTAINER_SNAPSHOT_DOCUMENTS` 加入必检目标，未设置 `KK_CONTAINER_ROOT` 时还把 checkout 的父目录当作容器。独立 clone 没有容器文档；任务 worktree 的父目录也不是容器。现有 [81c quality 失败](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38374225856) 与本机实际缺失结果一致，不能把外部文件复制进 CI 冒充仓库事实。

用户已授权本轮完整技术收口，采用以下范围契约：

- 默认严格检查仓库内 `SNAPSHOT_DOCUMENTS`、三个当前治理入口的完整生命周期字段，以及额外治理入口的重复 `current docId`；没有删除或跳过这些检查。
- `KK_CONTAINER_ROOT=<path>` 或 `--container-root <path>` 显式选择容器后，追加原清单中的全部外部快照检查。CLI 参数优先于环境变量；缺失文档和错误头部仍 exit 1。
- 未选择容器时明确输出 `container not requested (external documents NOT VERIFIED)`，通过结果只证明仓库范围。空环境值、缺路径或未知参数均失败；不存在自动“跳过失败”选项。
- 使用 `node:path` 解析实际选定 root，不假定磁盘名、checkout 父级或 OS 路径分隔符。含空格和中文的路径已纳入 CLI 回归。

取舍是把跨仓容器检查变成显式范围，而不是替独立仓库杜撰外部材料。原有本机 `KK_CONTAINER_ROOT=D:/kk-studio` 模式保留并真实执行；外部快照文件未改动。三 OS 轻量 job 只执行仓库检查及自建隔离 fixture 的 CLI 故障契约，不声称 fixture 是真实容器或产品运行证据。

## 本机 RED → GREEN

环境：Windows、Node `v24.20.0`、npm `11.19.0`；工作区 `D:/kk-studio/.worktrees/TASK-CHERRY-RED-001`。本专项没有启动 1421、1423 或 9349。

| 实跑 | 结果 |
| --- | --- |
| 原脚本，无 `KK_CONTAINER_ROOT` | RED，exit 1；4 个目标、1 个外部文档缺失 |
| 新 CLI 回归在原脚本上 | RED，10 项中 6 PASS、4 FAIL；失败为独立 checkout、显式 CLI root、参数拒绝诊断、空 env 拒绝诊断 |
| `node --test tests/unit/docIndex.test.ts tests/unit/docIndexSnapshotCli.test.ts` | GREEN，28/28 PASS、0 SKIP、0 FAIL |
| 上述两文件加 `tests/unit/governanceMerge.test.ts` | 37/37 PASS，activation 缺失/暂停、错误 SHA/审查/线程、merge queue 与禁用回读负例保留 |
| 新脚本，无外部范围 | exit 0；3 个仓库目标、0 违规；外部 NOT VERIFIED 明示 |
| 真实 `KK_CONTAINER_ROOT=D:/kk-studio` | exit 0；4 个目标、0 违规 |
| 真实 `--container-root D:/kk-studio` | exit 0；4 个目标、0 违规 |
| 显式不存在的容器 root | exit 1；外部快照缺失，未转成通过 |
| `npm test` | 1117 tests，1103 PASS、14 SKIP、0 FAIL；约 31.8s |
| 定向 ESLint、Prettier check、两个脚本 `node --check`、`git diff --check` | PASS |

新 CLI 10 项覆盖独立范围、缺失仓库快照、错误 lifecycle source、额外重复 docId、CLI/env 正常容器、显式缺失文档、坏外部头部、缺参数/空值/未知参数。测试复制本次真实门禁脚本与纯函数模块至唯一临时目录，实际运行子进程并断言退出码和诊断；只清理本测试自建目录。

另完成一次真实独立 Git clone：`C:/Users/Administrator/AppData/Local/Temp/kkcs-ca9f1ea7`，HEAD 精确为 `20cb90c060b7499da06e7eb6177245140cb3e790`。原提交脚本 exit 1；只把两份本次候选脚本复制至相同仓库路径后 exit 0；显式 missing root exit 1；显式真实 `D:/kk-studio` exit 0。没有向其父目录提供容器材料、没有安装或链接依赖；这证明快照门禁，不是完整 clone 的 `npm run verify`。

首轮真实 clone 使用长临时目录时，仓库已有深层截图路径触发 Windows `Filename too long`，checkout 失败保留为失败。第二轮采用短唯一路径和仅该命令的 `git -c core.longpaths=true clone --local --no-hardlinks` 后成功；没有改全局 Git 配置，也未改/删这些截图。

## Actions 根因与改动

[auto-merge run 38374224312](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38374224312) 绑定源 `81cfd11fe79279df2379e402ddefa00a908099a8`，公开 REST 回读 `event=push`、`conclusion=failure`、`jobs=[]`、`check_runs=[]`。实际页面 Annotation 为：

> (Line: 8, Col: 3): Unexpected value 'pull_request_review_thread'

[GitHub 官方 Actions 事件文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_review_comment) 明确 `pull_request_review_comment` 支持 `created/edited/deleted`；同页说明并非所有 webhook 都能触发 Actions。将非法 thread trigger 替换成该合法 review-comment trigger。`pull_request_target` 与 review trigger、同仓 main 条件、trusted base SHA checkout、`persist-credentials: false`、原权限、`merge-auto.mjs` 全部保持。

仅“解决/重新打开线程”不会独立触发该 workflow，需下一次支持的 PR/review/comment 事件重评；没有为此增加轮询、外部 webhook 或另一套控制面。实际 gate 仍读取所有线程的当前解决状态，缺失证据继续拒绝。此改动没有设置 activation/pause 变量，没有调用 merge/enable mutation，不代表自动合并已启用。

`quality.yml` 追加 `snapshot-portability` 三 OS job（Ubuntu/macOS/Windows），使用现有 checkout/setup-node 版本与 Node 24，零依赖安装，真实执行 28 条文档/CLI 回归和仓库快照门禁。原 Windows `verify`、其他必需 job、权限和完整验证顺序未更改，没有新增付费 runner 或依赖。

## 当前边界

本机 Windows 脚本与单测证据已取得。新 workflow 的实际三 OS Hosted 结果、最终提交 SHA 的完整 `verify`/Delivery 与独立审核由总体收口继续回读；这里不预填 SUCCESS。静态/YAML 格式通过不等于 GitHub 已接受或执行 workflow。live 模型规则 eval 未调用，记 NOT RUN；本专项是确定性 guardrail 验证，不是模型语义 benchmark。产品、UI、版本、真实 Provider、系统 vault、安装签名和用户验收不由本专项结论替代。
