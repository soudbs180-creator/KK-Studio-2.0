parent: TASK-KKD-IGNORE-USER-DATA-20261125

# 保护本机数据和启动器

从第一阶段审计发现的本地提交中承接两条现有 Git 忽略规则。共同基线为官方主线 `e4383a1e323c895286d9f08fe901a27e341a10da`，原始提交为 `1ef885badc6f24edcc21b79e5a9dd7335b31fdae`。

验收只查询 Git 对路径的匹配规则。应用数据、快捷方式和安装文件不参与读写。
