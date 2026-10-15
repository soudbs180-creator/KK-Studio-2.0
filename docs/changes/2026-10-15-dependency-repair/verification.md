# Verification：共享依赖事故与修复

- Task ID：TASK-VERIFY-DEPS-20261015；当前PARTIAL；[Review](review.md)。
- 时间顺序：HOME fc76完整verify已exit0，906旧输出/1812hash与1333产物外备已确认，工作树clean。随后准备Native本地依赖，guard失败但错误继续安装；npm日志记录Removing non-directory及任务树244包。直接读取主仓node_modules为普通空目录、240缺包；不是只替换联接而目标完好。
- 修复：主仓物理目录核对后，实际npm ci --ignore-scripts --no-audit --no-fund exit0，244包。未运行postinstall。修复前后package.json、package-lock.json及当前Git index SHA256完全一致；两树inspectDesktopDependencies均needsInstall=false。
- 日常EXE SHA256仍为aeb70dfce5d3e31f76a779986e041ce88ebddb2a5fe9771b0906d70af40371d5；未停止/重启用户进程或替换该EXE。
- 限制：原共享依赖字节未事先清点，不能称与原件byteexact；原junction入口被npm移除，没有声称成功保留。其他运行任务在短暂缺依赖期间的影响UNKNOWN。用户项目/素材未作为此操作输入，但不能把未观察影响写成零影响。
- 工程外证据根D:/kk-studio/.verification/2026-10-15-unified-execution-0908：dependency-incident-before-repair.json、dependency-incident-primary-repair.log、dependency-incident-repair-result.json、home-fc76e404-local-dependencies.log。旧HOME全量运行结果保持原sourceHead，不因事故或后续修复重写。
