parent: TASK-KKD-IGNORE-USER-DATA-20261125

# 验证记录

- 官方基线 `e4383a1e323c895286d9f08fe901a27e341a10da`。源码承接提交 `64230c8f7d0842646cba0f5462fd6db96b976215` 含 `cherry-pick -x` 原始来源。
- `git diff --check e4383a1e..64230c8f` 通过。源码差异为 `.gitignore` 新增两行。
- Git 路径验证 12 项通过。剥除新增两行后，其余规则逐字节等于官方基线。[实际命令输出](acceptance/round-1/git-ignore.txt)
- 首轮验收误把 `git check-ignore -v` 出现的否定规则当作忽略。复验用 `-q` 检查忽略状态，用 `-v` 检查规则来源。`.env.example` 可跟踪。
- 以测试路径字符串验证规则，没有创建用户数据、快捷方式或启动器。
