# Infinite Canvas 后端与插件来源

来源：[basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)，审计参考提交 e6d0911e9d509d00150eaab02f9ca05be94ffc46，MIT。各模块保留 LICENSE、作者说明和源码注释。当前目录含 KK 的适配，不能再描述为上游原样副本；当前完整文件指纹见本轮 evidence/vendor-source-manifest.json。

| 模块 | 上游位置 | KK 用途 |
| --- | --- | --- |
| canvas-agent | canvas-agent/ | Codex app-server、画布 MCP、SSE、会话与 Skills |
| canvas-proxy | canvas-proxy/ | 独立本地转发服务，仍需手动 npm run proxy |
| canvas-plugins | plugins/canvas/ 与 web/src/lib/canvas/ | 插件 SDK、四个内置插件、host 参考源码 |

源码、package.json、npm 锁文件、许可证现已解除 Git 忽略；node_modules、dist、日志、会话、auth.json 和生成的 public/plugins 保持忽略。只解除忽略不等于已提交，交付时须一起纳入源码输入。根 npm ci 的 postinstall 按各自锁文件安装依赖，关闭 vendor 依赖安装脚本，然后构建 Agent 与四个插件。根类型/lint 门禁仍不混入第三方代码；Agent 单独 tsc 和 npm run test:agent，根代理测试会导入 canvas-proxy。

开发入口为 npm run dev:agent。独立 npm run agent 要求调用进程提供至少 32 字符的 CANVAS_AGENT_TOKEN；Token 只用于当前进程，不能写入配置或输出日志。MCP 调用端须通过受控环境传递相同凭据。不要从历史启动日志取 Token。

Windows 随包构建使用 npm run client:build:agent，它准备 Node、Agent、Codex、生产依赖、许可证和逐文件 SHA-256 清单，再通过 tauri.agent.conf.json 加入资源。默认无资源构建仍可连接外部 Agent，在设置中明确禁用本机启动。使用和当前验收见 [Desktop Agent](../docs/changes/2026-09-22-agent-desktop/verification.md)。

KK 适配包括：代理无副作用导入、插件输出目录、条件会话准备、账号额度、受保护的生成图片读取、工作空间规范路径、内存连接凭据、专用 Agent 配置目录、动态端口、原生所有权握手和停止接单门禁。有版本校验的安装脚本放在 scripts/agent，遇到不匹配源码会失败，不能静默覆盖本地改动。

Codex npm 运行版本由锁文件固定为 0.155.1。该版本在本机新建默认 paginated 线程后，完整历史读取返回 list_turns is not supported yet；新建持久线程显式使用同版本协议支持的 historyMode: legacy。不修改现有线程文件、不吞掉恢复错误。升级 Codex 时必须重新验收真实新建、读历史和重启恢复。

保留原移植边界：不搬上游 file/image-storage、生成 API 前端层或整套 UI；图片归档复用 KK 自有素材库。Claude、第三方 MCP、插件尚未实测的扩展协议不因本轮 Codex 验收而成为已完成能力。
