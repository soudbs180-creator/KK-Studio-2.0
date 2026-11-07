# Spec：DPAPI 保护器受控契约

- Task ID：TASK-AI-GATEWAY-001
- 范围：`src/features/ai-gateway/dpapiProtector.ts` 及其公开导出和单测。
- 不做：不启动 powershell，不调用 DPAPI，不写入用户凭证，不改 Rust/Tauri，不改主仓脏文件。

## 契约

- 作用域只接受 `CurrentUser`。`LocalMachine` 返回 `DPAPI_SCOPE_UNSUPPORTED`。
- Windows 命令固定为 `powershell.exe -NoProfile -NonInteractive -Command <脚本>`。脚本只从 stdin 读操作和 base64，参数列表不得含载荷。
- 非 `win32` 在调用 runner 之前失败，错误码 `DPAPI_UNSUPPORTED`。
- runner 抛错、非 0 退出或空输出都变成 `DPAPI_PORT_FAILED`，消息里没有明文。
- `createDpapiSecretProtector` 拒绝空明文、空密文、与明文相同的输出，以及非法 UTF-8。端口抛出的原文被替换成固定错误码。
- 返回给存储层的密文是副本。端口之后改自己的缓冲区，不能改已保存的密文。
