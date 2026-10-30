# 验收

首建必须满足 src/packages/vendor/canvas-plugins 与 selected base 4610c3339db436147006171aec08aad4cfdfb679 字节/树一致；三端版本不变。依赖仅复用已审 dependency-cruiser 18.7.0 开发工具。新基线 commit 指向实际 origin/main，规则及集合来自既有已审检查器实扫当前源码/Git布局，不借用 c2 数字、不改宽阈值、不隐藏已有问题。治理统一传已解析 selected base，避免本机分叉 main 影响 origin bootstrap。CI 与后续改动继续按集合只减不增。

类型/lint/全单测、架构及目录反回弹测试、完整 verify、当前 SHA 独审/Hosted/Delivery 通过再正常 PR squash。无 UI、模型、存储、安装/发布改变；无需更改 Figma 或产品版本。不把这个前置 PR 当整个 P3/P6/ORG6 已合流。
