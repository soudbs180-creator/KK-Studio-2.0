# Spec：审计修复与当前事实收敛

- Task ID：TASK-AUDIT-REPAIR-20261017；状态 READY；2026-10-17。
- 权威：[intent](intent.md)、[ADR-022](../../architecture/adr/ADR-022-project-chats-and-v3-migration.md)、[分支规则](../../engineering/BRANCH-POLICY.md)、[启动契约](../../engineering/LAUNCHER.md)。
- 来源快照：`221560a322107092f66c142c7b911439087019f8`，未验收；原主仓 `8c36a6b138205613ae1a7c27950b86792da8de1a` 与 index 不作为本任务写入目标。

## 数据与执行边界

1. 协议 6 的 Agent 尚无完整 chat scope 时，新聊天/临时聊天及不支持的多聊天/v3 写入必须有明确禁用原因；保留已支持的 v2 单聊天及原始数据，不静默降级、删除聊天或自动迁移真实用户资料。
2. 外部模型授权保留 `[]` 的拒绝语义，受理时冻结授权；与主 Agent 自身推理模型区分。切换、取消和迟到回调仍遵守现有作用域。
3. 生成链固定 `providerConnectionId`，按 ID 核对 endpoint/credentialRef；缺 ID 只能接受唯一完整绑定，歧义拒绝；不使用 URL 相同替代账号身份。
4. 12AI 付费受理必须经过可持久、可 CAS 的 receipt port；未接入时 fail closed。内存 Map、旧测试或构建成功不能证明跨文档/重启恢复。
5. 素材垃圾箱操作必须由持久元数据接线；永久删除未完成引用检查与真实提交时禁用，不从局部隐藏推断删除成功。原件与已有引用保留。
6. 依赖安装、构建和发布写入要求任务独占实体目录；共享 junction/symlink 仅可只读复用，不运行安装或写入目标。启动器检查失败不得回退旧 EXE。
7. 原始身份校验先于默认值归一：显式null/empty不作为legacy缺失字段，不支持格式只读、损坏身份可读失败并保留原件。历史消息须在所有thread响应入口验证text；mutation已成功而历史无效时仍按原所有权/scope守卫保存归属回执后报错，GET不额外认领。
8. 素材直接src与懒加载重试均需真实加载结果；画布标签作为元数据跨撤销/重做保留，手机连线按钮在实际按下时保持44px，低缩放编辑器与端口均须可真实点击，不降低已有命中或几何验收。

## 治理与兼容

- 保持原 148 个 task ID、依赖、验收和原功能成熟度。26 个失效 worktree 的原 branch/worktree/status/verification 完整进入 verificationHistory，当前分配设 unallocated；缺工作树的 5 REVIEW 与 HOME，以及 branch 不符的 REVIEW-REMEDIATION 改 PARTIAL，绝不因此 DONE。
- 目录审计刷新 updated/sourceUpdates，不冒充产品复验更新 lastVerified。原统一任务继续开放，旧工作树只作历史；本轮安全修复由新任务承接。
- 统一接入层原 intent 原字节保留，四份新增文件只完成 requirements-only 文档结构；八项使用优先级仍由原 intent 定义，实施/真实账号/验收均未完成。
- FEAT-002/009/014/032 仅追加当前门控和开放任务；既有 runtimeEvidence 及 REAL/PARTIAL 等级不变。

## 平台与验收

Desktop → Web → Mobile；本轮受影响源码平台为 Desktop/Web，Mobile 2.1.1 规划不变。现已通过版本脚本递增 Desktop/Web 2.1.35→2.1.36；当前值已读取版本源，完整运行结果仍由执行回执决定，数字不代表发布。

AC-A 对应保全与恢复；AC-B 对应真实调用链/持久化反例及回归；AC-C 对应官方入口新鲜度、Native 重开及进程；AC-D 对应 schema、事实、链接/快照、功能和 Delivery。全量、Hosted、独立 exact-SHA review 和产品验收分别记录，不互相代填。

## 失败与恢复

写失败、未知受理、歧义账号或未来 schema 均拒绝推进并保留原件。只在独立测试根开展恢复；生产恢复须另核具体授权。回滚保留当前候选分支/原始快照和工程外备份，不 reset/clean 原主仓，不删除历史或恢复证据。
