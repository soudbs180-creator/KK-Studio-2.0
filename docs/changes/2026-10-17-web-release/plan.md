# Web Release Implementation Plan

> **For agentic workers:** execute the approved scope inline with independent review of the release scripts and final SHA.

**Goal:** 基于客户端已验收2.1.36修复用户授权的手机菜单裁切，重新验收2.1.37 Web，并在未来正式Release时自动部署。

**Architecture:** 产品只修手机菜单的视口定位。GitHub构建固定main/tag，受限SSH传输可重复清单包；服务器加锁校验、切换、健康检查和一个旧版保留。

**Tech Stack:** Node 24、Python 3 标准库、OpenSSH、Nginx、GitHub Actions。

**Spec:** [spec.md](spec.md)。

## Tasks

- [x] 固定 bbc8/469，隔离安装和重建，154 文件与验收构建逐哈希一致。
- [x] 盘点线上 current、唯一旧发布及业务服务；临时公钥取得明确授权并限时、禁转发。
- [ ] 原验收候选 PR/main 当前 CI 与独立聚合审查。
- [x] 实现最小清单包、受限服务器发布器和正式 Release workflow；验证错误包、回滚、保留和非正式事件拒绝。
- [x] 按后续授权修手机菜单、增加真实浏览器回归，重验2.1.37；固定归档元数据以支持同Release重试。
- [ ] 独立审查新脚本与工作流，完成相应检查和当前 SHA 托管门禁。
- [x] 准备唯一旧版备份、配置回执及受限普通发布用户；加密配置 GitHub 仓库发布 secrets。
- [ ] 发布并实测 HTTPS 身份、手机布局与回滚；仅清理可核验的更旧静态版本。
- [ ] 撤销临时 root 公钥/本地私钥，记录服务与数据边界，更新任务和交付事实。

## Review Focus

拒绝坏包和路径逃逸；健康失败不损坏旧指针；清理不越界或删除 current/previous；正式 Release 必须同 SHA 已通过 main 质量验证；失败或重入不能混合版本。旧浏览器原始资料不得为验收而修改。
