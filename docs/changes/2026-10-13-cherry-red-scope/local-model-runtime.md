# 真实本地小模型运行时证据

任务：TASK-CHERRY-RED-001。日期：2026-10-13。源码 HEAD：`20cb90c060b7499da06e7eb6177245140cb3e790`，产品并发候选另由总体收口绑定；本专项只准备运行时、模型、公开请求和本文，不修改产品、测试或版本。

## 官方来源与许可

本轮只使用官方主源及其正常 HTTPS 下载重定向。2026-10-13 实际读取 [Ollama latest release API](https://api.github.com/repos/ollama/ollama/releases/latest)，最新稳定版为 [v0.40.3](https://github.com/ollama/ollama/releases/tag/v0.40.3)，发布时间 `2026-10-11T01:39:04Z`。Ollama [Windows 文档](https://docs.ollama.com/windows#standalone-cli) 指定便携 `ollama-windows-amd64.zip`，未使用全局安装器、开机注册、软件商店或第三方镜像。

Ollama 核心为 [MIT](https://github.com/ollama/ollama/blob/v0.40.3/LICENSE)。Qwen 官方 [Qwen2.5-0.5B-Instruct LICENSE](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/main/LICENSE) 为 Apache 2.0，且本次从 Ollama registry 下载的许可层 SHA256 与该官方文件精确一致：`832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e`。SmolLM2 官方 [135M Instruct 模型卡](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) 和官方模型 API 均声明 `apache-2.0`，API 回读源 revision `12fd25f77366fa6b3b4b768ec3050bf629380bac`；其 [Ollama 模型页](https://ollama.com/library/smollm2:135m) 和实际 `/api/show` 许可同为 Apache 2.0。本地软件/权重可按这些许可使用，无需采购模型许可或云 API 账户；云端服务价格不由此结论覆盖。

## 工件与隔离

全部运行时、权重、配置、临时身份和证据位于工作区 `.tmp/cherry-red/ollama-real/`；Git 实际回读该目录与自建身份文件均被 ignore。没有更改持久 PATH、用户环境、系统代理/DNS或已有模型目录。

| 工件                           | 实际身份                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| 官方 Windows amd64 ZIP         | 1,468,053,171 字节；SHA256 `e5ecff02dfc7cae8ddf6d6b7a7ac5f727ffeedf4491f44ae75ff5b0820dbbbd5`       |
| 官方 `sha256sum.txt`           | SHA256 `efe3861780df1fd53a79a82fbc3c06fad5076fecd47c0d04218ea74317d7fbbd`                           |
| 便携 `ollama.exe`              | SHA256 `61b44cfb6d3aa2393a4a731af33c9329bedd58b1c454bdebd185d4a607d0303d`                           |
| `qwen2.5:0.5b` manifest digest | `a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67`；本机 `/api/tags` 同值           |
| Qwen GGUF 权重                 | 397,807,936 字节；SHA256 `c5396e06af294bd101b30dce59131a76d2b773e76950acc870eda801d3ab0515`；Q4_K_M |
| `smollm2:135m` manifest digest | `9077fe9d2ae1a4a41a868836b56b8163731a8fe16621397028c2c76f838c6907`；本机 `/api/tags` 同值           |
| SmolLM2 GGUF 权重              | 270,885,952 字节；SHA256 `f535f83ec568d040f88ddc04a199fa6da90923bbb41d4dcaed02caa924d6ef57`；F16    |

ZIP 摘要同时核对 GitHub release asset `digest` 和官方 checksum 文件。两模型的 manifest、config 与全部 layer 均从 `https://registry.ollama.ai/v2/library/<model>/...` 获取，并逐件核对官方 manifest 中的 SHA256 和 byte size；没有重新量化、改 template、修改许可、替换权重或拼接虚构结果。

服务子进程明确指定自有 `OLLAMA_MODELS`、`USERPROFILE`、`TEMP/TMP`，只在其子进程环境生效。官方 [serve 源码](https://github.com/ollama/ollama/blob/v0.40.3/cmd/cmd.go) 首次启动会生成 `.ollama` 身份，因此 profile 也隔离在本任务目录；此私钥不读取、不输出、不导出、不提交。只调用公开下载与 loopback 本地 API，`OLLAMA_API_KEY` 为空、`OLLAMA_NO_CLOUD=1`。该 cloud 禁用配置由 [官方 envconfig](https://github.com/ollama/ollama/blob/v0.40.3/envconfig/config.go) 支持。

## 首次失败与真实恢复

原服务 PID `64808` 在启动前确认 11434/11435 都未占用；监听随后回读为本 PID。首次实际 `POST /api/pull` 返回 HTTP 500：官方 R2 下载 CDN 被本机环境 DNS 解析为非公网 `198.18.0.111`，Ollama 的 public-IP 下载保护拒绝重定向。原始 `pull-first-attempt.json` 保留该错误，不改成 PASS。

未修改 Ollama 下载保护、DNS、系统代理或任意 allowlist。读取同一官方 registry 的 manifest 后，通过普通 HTTPS 下载其精确 blob，逐 digest/size 校验，再按 [官方 manifest 路径实现](https://github.com/ollama/ollama/blob/v0.40.3/manifest/paths.go) 放入自有模型目录。此后再次实际调用原 `POST /api/pull`，返回 HTTP 200、`{"status":"success"}`。SmolLM2 使用同样的官方原件校验方式。这里说明恢复路径，不把首次自动下载失败隐藏为一次无故障 pull。

收到新增 CPU-only 要求后，原服务尚未加载或生成模型。root 明确授权受控重启；实际核对旧 PID、完整路径和 start ticks，并确认 `/api/ps` 为空。优雅窗口关闭不可用，随后只停止字面指定的自有 PID `64808`；没有按名称停止其他 Ollama 或系统进程。组合重启命令曾被自动审批拒绝，未执行；改为仅操作固定自有 PID及单独启动的更窄命令后成功。未绕过审批改用其他执行通道。

## 真实 API 验证

当前服务由本任务保留给 Native/UI 验证：`http://127.0.0.1:11434/v1`；模型精确 ID 是 `qwen2.5:0.5b` 与 `smollm2:135m`。新 PID `43124`，StartTime UTC `2026-10-13T10:24:02.8085096Z`，ticks `639274838428085096`。`owner.json` 记录完整 exe/path/hash/profile/model 归属；11434 监听实际回读为 `127.0.0.1` 和该 PID。

CPU 进程设置 `CUDA_VISIBLE_DEVICES=-1`、`ROCR/HIP_VISIBLE_DEVICES=-1`、`GGML_VK_VISIBLE_DEVICES=-1`、`OLLAMA_VULKAN=false`。真实启动输出 `library=cpu`；完成两模型请求后，真实 `/api/ps` 两项均 `size_vram=0`。原便携包自带的 GPU 文件没有注册或安装到系统，没有采购/安装驱动、GPU 服务或调用云端推理。

公开 synthetic 问题：`Answer this public test question in one short sentence: What is 2 + 2?`。每次请求 `max_tokens=32`、`temperature=0`；直接 HTTP 请求未携带 Authorization/API key。

| 实际请求                              | 结果                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /api/version`                    | HTTP 200，`0.40.3`                                                                                                 |
| `GET /v1/models`                      | HTTP 200，两个精确 ID 均真实列出                                                                                   |
| 两模型 `POST /api/show`               | HTTP 200，读取实际加载元数据与 Apache 2.0 许可                                                                     |
| Qwen 非流式 `/v1/chat/completions`    | HTTP 200，约950ms；`2 + 2 equals 4.`；9 completion tokens，`finish_reason=stop`                                    |
| SmolLM2 非流式 `/v1/chat/completions` | HTTP 200，约361ms；`I'm ready to help with your public test question.`；12 completion tokens，`finish_reason=stop` |
| 两模型流式 `/v1/chat/completions`     | HTTP 200，`text/event-stream`，真实 finish_reason 与 `[DONE]` 均出现                                               |
| 两模型加载 `/api/ps`                  | HTTP 200，2项真实权重，均 `size_vram=0`                                                                            |

SmolLM2 的该次回复没有回答算术；保留原件，不把传输完成说成内容准确。这里证明真实两模型协议/执行链与免费本地运行，不代表模型质量评估、真实云 Provider、图片生成或产品 UI 已验收。

本机原件汇总 `.tmp/cherry-red/ollama-real/runtime-receipt.json`，在交接时 SHA256 为 `b1fc4e6b1343caf816ca15615c7669af17947cb2a5b49711d944f19320864d98`，含23份证据路径、SHA256和size；全部重新回读校验。HTTP receipt、请求、响应、原始 SSE 与 CPU `/api/ps` 在该目录；持续写入的 server log 只另存必要 CPU 行快照后计算摘要，不把活动日志冒充不可变文件。这些是本机临时证据，尚未作为发布工件或安装收据归档。

服务仍保留运行，等待 root 完成 Native/UI 验证并明确通知清理。最终清理须再次核对 PID/path/start ticks，只处理本任务进程；不删除用户系统模型。没有停止 browser agent 的1423，没有改1421/1423/9349或全局启动项。

补充实际交接回读：root随后发现11434已ECONNREFUSED且PID43124不存在。以上历史API/CPU证据不变，但不能将旧进程称为仍就绪。最终Native验证改由同一个有界测试进程启动相同hash的便携exe与自有模型目录，完成UI后清理自有树；实际新PID/结果以该轮回执为准。
