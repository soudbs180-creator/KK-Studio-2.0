# Spec：TASK-VERIFY-ORIGIN-003

- Playwright 生产验收的规范 origin 为 `http://127.0.0.1:1423`。
- `KK_TEST_PORT` 未设置或显式为 `1423` 时，`baseURL` 和 `webServer.url` 都必须是规范 origin。
- `KK_TEST_PORT` 只要显式存在且不是 `1423`，配置必须在启动 Vite preview 和浏览器测试前抛错。
- 页面 URL、Agent fixture 的 CORS 响应和 image compare 的独立 context 均不得回退到可变端口。
- 开发服务 `1421` 和产品来源白名单保持现状，不由本任务改写。
