# Spec：Git pre-push 路径兼容

- Task：TASK-FIX-PUSH-GUARD-SPACES-001；[Intent](intent.md)；READY。
- 钩子仍从 common Git hooks 加载配套策略，不依赖安装 worktree 生存；保持调用者 cwd、stdin、远端参数和策略退出码。
- Git Bash/MSYS 有 `cygpath` 时，将完整策略路径转换为 Windows 原生路径，作为一个参数传给 Node；其他 POSIX 环境保留原路径。转换失败、空路径、缺少策略或 Node 时给出可读诊断并拒绝推送。
- `evaluatePush` 规则不变：main/master/release、删除、非快进、未知祖先、已有标签修改、非法输入及命名空间继续拒绝。
- 默认安装继续拒绝覆盖不同文件及任意有效 `core.hooksPath`；`--upgrade-reviewed-v1` 仅接受字节匹配的已审阅 v1 钩子/策略组合，先排他备份旧钩子，再原子替换。未知、修改、缺失文件拒绝，其他 hooks/config 保留；重复安装幂等。
- 六个必需真实 Git 用例：单级空格、多级空格、策略绝对路径超过 260 字符，各自验证合法 topic 创建/快进和非法 main/非快进推送；检查远端 refs 的实际结果。
- 长路径 Windows fixture 仅在隔离仓库设置 `core.longpaths=true`；不修改系统注册表或用户 Git 配置。MSYS 自动参数转换关闭时仍须通过。
- 补充启动边界测试：在 Linux 用明确标识的转换/原生启动替身执行真实钩子与真实 Node 策略；验证转换失败关闭推送。替身测试不是 Windows 验收。
- 不需要新 ADR：未改变模块依赖、策略权限或产品数据契约。
- 上游 #47 默认 squash 合并后，依照 BRANCH-POLICY 从新 main 承接本任务提交并重新验证，不能直接改 base 宣称历史已去重。
