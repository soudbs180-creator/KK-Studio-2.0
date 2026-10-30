# 约束与验收

治理入口新增根文件白名单、禁入扩展名log/gz/webm/tsbuildinfo/bak/orig/tmp、docs图片200KiB、test.ts/Markdown落位、src备份和非ASCII/空白文件名检查。路径按Git原始NUL分隔读取，检查已跟踪及未忽略未跟踪文件；被gitignore排除的文件须git add -f后仍被检查。

存量违规以规则+路径为键，只有Git基线已存在的键可被豁免，禁止等数换项及扩大基线。既有超限图片最多保持原字节数，不能增大。Git基线不存在时从明确base提交推导bootstrap上限，新增违规不能藏进初始基线；无法读取base/配置时失败关闭。新增根文件须登记配置白名单及文档用途并随提交审查。

补篇B11“Markdown仅docs/根”与B6.3强制vendor子目录UPSTREAM.md冲突，具体上游溯源要求优先，仅豁免vendor一级子目录UPSTREAM.md。Mobile独立测试遵循现有mobile/tests边界，允许该位置的test.ts；其他非tests/位置不放行。不把这一精确兼容扩大成任意vendor/包内文档白名单。

索引/元数据沿用已有doc-index/snapshot检查；同名模块沿用R8，不重复实现。故障注入证明每条拒绝规则及基线不能扩张，现存文件不报红。门禁接入governance→lint/verify，但只有候选整合后才代表主线启用。
