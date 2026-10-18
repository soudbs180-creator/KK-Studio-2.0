# Plan：修正手机入口并自动部署

- Task ID：TASK-WEB-RELEASE-20261017；[Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md) / [Release](release.md)。
- 独占 worktree `TASK-WEB-RELEASE-20261017`，分支 `fix/TASK-WEB-RELEASE-20261017-mobile-entry`，基于 main `503dedbe`。原 fix 分支和 2.1.37 所有失败/通过证据保留。
1. 对照原手机版源码、截图和依赖恢复独立工程，记录原始文件哈希，不带入旧桌面源码。历史身份协议测试只在 tests/support 保留真实 loopback fixture，不部署第二套身份服务。
2. 补 Web local context、可选账号及所有 UI 调用方，测试隔离、损坏数据保护、切换竞态和无账号出网拒绝；Native 默认路径保持。
3. 构建 Desktop 与 `/mobile/` 组合包，初始视口/UA分流和显式桌面出口；CI锁定两套依赖，手机独立 lint/type/test/export。
4. 同状态浏览器检查真实 Cherry 手机页面、触控、抽屉、窄矮横屏、深链接刷新、草稿重载和 Desktop 宽屏；保存截图/DOM/加载产物身份。
5. 独立审查精确 SHA、PR 与 Hosted CI；合入后 exact-main 再验，发布不可变正式 Release，由既有受限自动链路部署。
6. 配置 Nginx `/mobile/` SPA 路由，校验完整清单、HTTPS身份、一个旧版回滚和服务/data边界；正确手机页面上线后撤 root 临时钥和本次本地私钥。
7. 同步本包、任务0与治理入口。状态仅反映实际证据，独立 Mobile 原生/正式账号与真实 Provider 未完成项继续开放。
