# 独立审查

本轮内容预检完成，后续产品快照的正式独立 SHA 审查也已完成；不是 GitHub 平台批准或 main 合入。

独立 reviewer 发现并复现两项问题后已关闭：P1 Windows 大小写路径可绕过目标准入，改为与来源校验一致的 `/i` 匹配并加失败回归；P2 原目录目标测试提前失败后不能再证明回滚，新增 blob 已发布后 record 写入故障注入，四类原件逐字节回滚。

独立复核主工作区与修复树四份存储文件指纹完全一致；HTTP 解析兼容 1/1，普通/压缩 JSON、坏输入及错误后 health 均验证；没有弱化旧断言。body-parser/qs 实际解析版本和 registry integrity 已核对，vendor 文档未把当前指纹混同固定上游身份。

| 文件 | SHA-256 |
|---|---|
| src/features/local-service/store.ts | bc6d6f0b3966f294a0455ac7aedc810c1dc61e60b2e322555bab295d6f654943 |
| src/features/local-service/migration.ts | f3d0726cef43e417ecafd35dc02d43b527831576e8af9b8e1a47f442572a0cbd |
| tests/unit/companionRestoreTargetProtection.test.ts | 233cacec1fa1ea254672d9171c5dbfa90941b64a48009dffaab17083a3ba1b3f |
| tests/unit/localServiceMigrationOrigins.test.ts | 61446280a99411659967ba588449f246cdd47736c3af87b7f0382f49326cdde1 |
| vendor/canvas-agent/package-lock.json | dfec8be52e32c5719586235a9f9d75dbb900efa715db27e102282a2745efcd13 |
| vendor/canvas-agent/src/server/codebuddy-http.test.ts | 9dfa3144a385b1c451361b46185fee34a88ca98300768b3906e806f216e36b46 |

固定上游身份、其他公告、完整 verify 之外的真实 Provider/Native/像素边界仍由验证记录分别列出。安装快照后如运行源码变化，需重新验证，不沿用本内容审查。

## 固定产品快照审查

- Base `cc222004d8b3104357854d9c6b7a331d0c52a869`；head `df597194377d83c5d9dfe0c1204380e84004fe82`；tree `b71d9d22b2e4235f5e8c0e8892ad557f318b797c`。
- 独立 reviewer 完整读取 35 份变更及相关调用链，自行定向 25/25，vendor 指纹 101/101，实际锁版本和安装收据匹配；开始、结束均 clean。
- 结论 PASS，仅覆盖该固定提交的有界变更。主工作区仍保留未提交内容，本地构建快照没有推送或合入。
- 证据位于容器 `output/closure-20261109/final-review/review.json` 与 `review.md`。

后补桌面验收脚本按当前设置导航与 v3 活动聊天契约更新，产品运行源码未变；脚本运行结果及其独立补充审查按脚本 SHA 分开记录，不追改上面的固定提交身份。
