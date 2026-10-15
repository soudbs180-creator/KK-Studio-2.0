# Verification：GDI保护统一承接

- Task ID：TASK-EXPLORER-GDI-20261015；状态：PARTIAL；角色：current；[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)。
- 临时base6374c23f；root单写；原治理89fba分支与GDI af8工作树保留。af8父tree/main235e tree均5636c8a986be432539c3fbe67a2fef4bbb2e61a0。
- 基线：输出任务首版独审两项CHANGES REQUIRED已RED/GREEN修正，新Node1347/1333PASS/14skip，lint/typecheck/format通过，最终复验中；不得将其当作本组合完整verify。
- 原af8精确完整verify及100页保护已在正式首轮新验，旧development原件缺失仍明示；本组合尚未运行浏览器、未合main、未更新客户端。

- 独有af8已承接为a6e066168f473c4004a390f1e3f163712d236b87；仅配置imports发生冲突，解法保留6374完整输出/worker配置并增加GDI import/use，development自动合并保留两套保护，实际7文件差量与af8范围一致。
- 当前Windows参数回归exit0：唯一feature switch、原15项+msWindowTabManagerPublic、2个自有renderer全部一致。新真实PNG探针正常/主动失败各1：旧合成PNG/report字节保持，真实新PNG签名有效且与report同run。sourceHead=a6e，probe文件当时未提交，结论限候选；最终冻结后重跑绑定。日志gdi-integrated-a6e06616-argv.log/png.json。
- 治理PR61当前required verify/delivery及quality、hooks均success，无未解决review threads/人工reviews0；独立治理merge-scope PASS，已退出draft后expected head89fba普通squash成功main3a9925977792a7f948eceda9f54d46fbf6f8b294。main fetch/树一致性、后续测试安全候选重绑与Hosted分别记录，不代填产品客户端验收。

- 已fetch远端main3a992597，git diff 89fba→3a exit0；main父235e、tree db1152d018ffaa5dd57ea5ad1f721a849093490e。四独有安全提交重新承接后git diff 8729→384546c8 exit0；新分支祖先真实main，不rebase/force/删除旧分支。

- 首次重绑delivery44文件报1项：输出任务仍指旧分支，导致其新交付包未绑定当前branch。已改为同一逻辑测试安全PR的实际branch，两个稳定ID保留、只有GDI IN_PROGRESS；门禁不放宽，修正后复验结果另记。

## f727首轮完整验证失败与有界恢复

- 完整verify exit1：Node1347/1333PASS/14skip，Agent201/199PASS/2skip；browser784中773PASS/11FAIL/0flaky/0skip；development未运行。441产物已整份外存并有逐文件hash，旧PNG/report/receipt三项及备份hash均不变。详细safety-f7276fee-failed-summary.json保留每次错误与重试；日志中文标题存在终端解码限制，直接写入的UTF-8 JSON/DOM原件有效。
- root原依赖准备只补Agent，漏了postinstall既定插件步骤；public/plugins及vendor插件依赖不存在，实际菜单只8项而应12项。未改产品源码/测试断言，只plugins:install17packages/build与重建dist，同f727 SHA原11项全部首试通过（13.6s/0retry），证实该批环境因果，不改写首次失败或借历史13失败替代。
- 新UI/development测试入口先plugins:build，缺依赖前置失败，避免再次跑到浏览器才暴露；原依赖版本/锁文件/应用版本保持。
- 独审SHOT-01/P2和DOC-01已进入修正：quoted/条件/变量options/shorthand/spread5负例全漏先RED，getter再RED；严格直调outputPath后7类负例+当前122截图守卫GREEN。六个既有helper调用等价展开，当前19文件54路径迁移，业务断言不动。canonicalHead/taskLedger已同步实际3a/144。最终新HEAD独审与完整verify待运行，原f727不提升为PASS。

- 补强后定向9/9、lint/typecheck/format均exit0；当前源码准备冻结，新完整verify尚未运行。PR58最新补充按USER_REPORTED_REMOTE_READ追加原TASK-GOV-006.sourceUpdates；不改变优先顺序，不继承旧验收或替代届时远端重核。
