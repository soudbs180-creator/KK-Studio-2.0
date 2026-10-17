# Release：Web2.1.38 独立手机入口

- Task ID：TASK-WEB-RELEASE-20261017；产品PR：66；日期：2026-10-18。
- 状态：RELEASED；生产技术、用户实体手机UI及临时授权清理PASS。
- 正式Release：`v2.1.38` / ID415969948，非draft/非prerelease。
- 来源：main `f730f1dc32fb2e568dda6d4a52c58b05802d6b6b`，tree `53dd0eac369b3fc3cc31364217048c521da956c5`。
- 版本：Web2.1.38 / Mobile源码2.1.3 / Desktop源码2.1.37。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

## 已上线的行为

main quality39052635456五项/guards39052635453通过后，正式Web部署run39055538017 / job117462622818成功。kkai.plus手机默认进入独立聊天UI `/mobile/`；宽屏保留Desktop，`/?view=desktop`进入原桌面资料。两空间独立，不自动迁移、上传或清空。

生产Edge九项首试9/9、0retry/skip/flaky，53.8秒；入口、菜单触控/裁切、草稿重载、可选登录往返、深链/404均通过。用户直接确认“已显示独立手机 UI，正常”。完整产物hash和生产证据见[verification](verification.md)。

2.1.37旧正式部署虽成功，其桌面响应式曾被用户拒绝为手机版；不把旧响应式检查改称本次独立手机验收。

## 回滚与清理

当前`releases/v2.1.38`，唯一previous为`releases/v2.1.37`，恰好两受管目录，旧4a已GC。当前179/上一155文件服务器全hash通过；撤钥后7个公开入口再验HTTP200、no-cache、gzip及manifest hash均通过。API/PostgreSQL/Nginx主PID保持active；临时root授权0、原authorized_keys字节恢复、临时身份连接拒绝。本机两任务私钥及隔离测试已删，正式Actions受限凭据保留。

需要恢复时，在既有root控制台使用固定命令。本轮未执行此生产回滚，机制已隔离回归、上一版全hash通过：

```text
python3 /usr/local/lib/kk-managed-web-release.py rollback v2.1.38 v2.1.37
```

回滚后须重新核对指针、HTTPS与UI；37是恢复目标，不称其满足独立手机UI。Git历史、不可变tag、恢复材料、业务数据及本地dirty不在旧静态版本删除范围。

## 后续更新与边界

只跟随正式Release自动部署；普通commit、draft与prerelease不触发。Windows tag workflow39055499316因Web38/Desktop37不同而失败，未发布新Native包，与Web成功分开，不称用户本地Desktop已更新。

用户手机UI已接受，浏览器/引擎未知，Safari未单独专项；实体手机真实Provider/账号完整生成链、新APK/iOS、正式身份/云同步未验。FEAT-028保持PARTIAL，T12开放。治理及其他149任务/36功能保护已核对；最终DOC_HEAD、独审及Hosted/Delivery以本收据PR当前HEAD与外部回执为准。
