# P1 作者自审与独立审核边界

Self-review：已对照当前源代码、spec/plan与实际检查结果完成；independent review：NOT_VERIFIED。用户禁止子代理，未调用其他AI/派发新上下文；作者结论不能替代独立审核或解除main门禁。

## 发现与处置

- P1-TYPE-01，已修：网络权限以普通Zod字符串分支表达会把CapabilityPermission放宽成任意string；负向编译先RED，改为Zod templateLiteral后GREEN。未声明的filesystem:write同时被运行schema和公开类型拒绝。
- P1-COMPAT-01，已修：不能因清单中保留旧适配器而拒绝全部清单；正例先RED，改至少一项兼容，仍拒绝完全不兼容/非法range。P2必须逐项筛选，schema通过不等于每项可调用。
- P1-TYPE-02，P2已知限制：严格ES2022且全检依赖声明会受Zod全局URL声明影响；失败保留，无DOM补丁/依赖修改/门禁调参。现行包配置不变且根/Mobile与独立项目配置通过，严格配置的消费者目前不支持，TASK-MOD-P1-TYPES继续跟踪。

## 范围与安全

只有纯声明/校验与类型Port；所有旧任务/资产/供应商类型文件字节未改，旧函数通过Mobile回归。无注册表、调度/权限运行实现，无存储迁移、秘密持久化、付费请求、UI或src修改。Card检查只验证相对路径语法，实际存在与功能卡/任务对应由P1-G承担；uses只校验局部身份，自身/重复拒绝，跨manifest环留P2。无try/catch吞掉schema失败，无any、skip测试、force交互或重试参数绕过。

## 作者技术裁定

按用户新优先级在P0候选上堆叠P1，不代表上游门禁已收尾；仅本轮指定三个Port，其他Port/治理/投影继续追踪；网络权限为hostname声明，实际授权由P5；采用独立业务Manifest名称保持旧供应商类型兼容；纯TS源包携带@types/semver供独立消费者解析；严格依赖声明配置的限制公开保留。这些决定的代价是P2须完成真实装配/筛选与对拍、严格消费者仍需上游/独立包装方案，不能直接合main或宣称所有能力已解耦。

Ready to merge：No。当前契约候选可审阅；上游P0/ORG、独审及完整verify/main整合仍开放，真实运行注册/协议投影未由本卡完成。
