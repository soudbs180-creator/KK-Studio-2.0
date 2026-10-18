# Spec：Web2.1.38 生产验收与边界

- Task ID：TASK-WEB-RELEASE-20261017；日期：2026-10-18；状态：IMPLEMENTED。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md)。
- 实现基线：main `f730f1dc32fb2e568dda6d4a52c58b05802d6b6b`，完整tree与PR66审查候选一致。
- 契约：[实现规格](../2026-10-17-web-release-receipt/spec.md)、[可选账号ADR-019](../../architecture/adr/ADR-019-unified-local-repository-and-optional-account.md)、[Mobile功能卡](../../features/feat-028-mobile.md)。

## 入口、数据与权限

首次载入`/`或`/index.html`时，viewport <=767或phone UA进入`/mobile/`，保留query/hash。`view=desktop`明确选择桌面，不因后续resize自动跳转，不接管Desktop深链。

Mobile使用独立Expo/RN Web聊天、抽屉与composer，入口为`mobile/src/app/_layout.tsx` → workspace index → `ChatScreen`；Desktop保持原Web。两者存储空间隔离，提供旧桌面资料入口，不自动迁移、覆盖、上传或清空资料。

Web可使用真实本机context，不构造AuthSession或假token。稳定guest namespace、登录realm、epoch和迟到回调保护保持有效，账号可选。用户自带Key直接Provider有独立凭据边界；Gateway、Companion、云同步须在出网前取得真实登录授权。会话凭据不明文持久化，本机存储不称为云保存。

## 发布与恢复

仅非draft、非prerelease的正式released事件部署。不可变`v2.1.38`绑定合格main，mobile/deploy-linux/delivery/governance/verify五job完成success后，由受限普通账户发布组合包。

archive、manifest和来源SHA须可核对；服务器文件系统中的current/previous全部文件逐一验证SHA256。HTTPS逐hash覆盖两HTML、直接JS/CSS、selector和build-info入口资源集，不称为对全部179文件发HTTP请求。健康失败恢复原current/previous。

最终仅保留`current=releases/v2.1.38`、`previous=releases/v2.1.37`。旧版本删除只限受管静态目录，不触及API、数据库、uploads、本地dirty、恢复材料或其他任务。完成后撤本次临时root授权、保留其他授权和正式受限部署凭据；回滚命令及未实际生产演练边界见[release](release.md)。

## 验收映射与未验范围

| AC   | 检查与完成口径                                                                       |
| ---- | ------------------------------------------------------------------------------------ |
| AC-1 | 同源生产九项覆盖窄/横/矮屏、桌面覆盖与深链；用户实体手机浏览器UI实际确认             |
| AC-2 | 真实隔离context、草稿重载、可选登录往返、原触控/裁切/网络/异常断言                   |
| AC-3 | main门禁、正式Release、全量服务器hash及有限HTTPS入口核对；缺失资源真实404且无SPA入口 |
| AC-4 | 隔离回滚、previous全hash、恰好两目录、撤钥及服务保护收据                             |

生产harness仅允许精确`https://kkai.plus`且不启本地服务；保留DOMContentLoaded后的UI就绪断言、原timeout与0重试。

用户手机UI已验收，具体浏览器/引擎未知，未单独进行Safari专项。实体手机真实Provider/账号完整文本图片链、新Native APK/iOS、正式身份/云同步/GPU/Companion生产服务仍无验收证据；FEAT-028保持PARTIAL，T12开放。
