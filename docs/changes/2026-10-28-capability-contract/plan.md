# P1 Capability Contract Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans；用户禁止子代理，主代理逐项实现，不执行代理派发。

**Goal:** 在已有叶契约包发布兼容能力声明及三个Port，保持宿主逻辑不变。
**Architecture:** capability.ts用Zod/semver校验声明，ports.ts只用现有叶类型；contractVersion.ts共享版本，index公开兼容出口。
**Tech Stack:** TypeScript6/Node24、Zod4.6.7、semver7.8.5。
**Spec:** [spec.md](spec.md)。

## Global Constraints

纯ES2022、types=[]，不依赖DOM/Node/React/Tauri/宿主src；不接入任何入口；九态/审批/保存/数据身份保持。仅3个Port，不把P1-G/P2/StoragePort/PermissionPort或旧门禁算完成。

## Review Focus

未知/带秘密字段不应静默剥除；非法/通配权限不得误授权；版本/适配器不兼容不得接受；uses自身/重复与跨图环分开验收；包必须在无宿主依赖的独立安装中可消费，旧供应商CapabilityManifest不能被覆盖。

## Task 1: 契约、兼容出口与独立包

Files: 新建packages/creation-contracts/{capability,ports,contractVersion}.ts，修改index.ts/package.json/README.md，生成包lock；Mobile仅同步file依赖锁记录。tests/unit/capabilityContract.test.ts验证schema，tests/fixtures/capabilityPorts.ts验证公开接口与拒绝形状。

Interfaces: capabilityManifestSchema→BusinessCapabilityManifest；permissionSchema；TaskPort.submit/subscribe/cancel/retry/recover；AssetPort.read/write；ProviderPort.resolve/submit/getStatus/cancel/listResults。精确字段见spec与类型夹具，全部复用现有CreationTask/StoredAssetMetadata/ProviderConnectionIdentity。

- [x] 写测试：有效inpaint声明、非法id/版本/权限/schema key/card、adapter重复/归属/兼容、uses自身/重复、fallback、未知字段、平台/降级、预算边界、旧供应商类型与负向Port编译。
- [x] RED：node --test tests/unit/capabilityContract.test.ts，预期缺少新schema/接口；保留日志，不把环境错误说成业务RED。
- [x] 添加Zod/semver依赖及最小schema/三Port，版本1.1.0；独立包锁与Mobile file依赖记录同步，不升级应用版本。
- [x] GREEN：同一契约测试、包独立typecheck、ES2022负向编译及打包后独立consumer浏览器bundle+运行通过。
- [x] 旧回归：根typecheck/lint/npm test、包格式、R6、Mobile相邻类型/契约回归及root build；预期无新增失败，旧完整浏览器失败仍单独保留。
- [x] 更新四文档总清单、治理/PROGRESS/恢复入口、作者自审；git diff仅允许计划文件，提交feat(creation-contracts)。P0/ORG/main及独审仍开放。

Ruling: 按用户新指令先实施P1候选，代价是不能把它直接合main。权限限定为声明非授权；跨manifest环留P2；三个Port以当前源映射，P2须补真实实现编译。用户自治规则已覆盖技术方案执行，不逐阶段请求形式批准。当前只自审，不伪造独立上下文。

Execution record: 12项RED为新出口缺失，最小实现后全过；补混合兼容适配器用例RED→GREEN，最终13项。Ruling: 总体兼容要求至少一个适配器支持当前版本，不能把可并存的旧版适配器全部拒绝，P2仍须逐项过滤。Ruling: 独立消费者的严格依赖声明探针失败明确保留，另按包现有配置验收；不改变有效项目门禁或扩大“纯ES2022源”的证明范围。日志与临时验证路径按项目目录规则归容器，持续状态由本plan和task-ledger记录，不创建第二套代理任务树。

Task 1: 声明候选与本轮检查完成；根2338 pass/0 fail/20 skip，Mobile373 pass/0 fail，独立项目配置/VM运行通过；严格依赖声明探针exit2保留。Final review: self-review only (user forbids subagents)，main/独审/完整P1仍未关闭。
