# Vendor 指纹增量勘误（2026-11-09 独立审查修复）

本轮独立审查修复改动了两个 vendor 文件，用于把「请求体解析错误」从 500 归位为 4xx：

- `vendor/canvas-agent/src/server/http.ts`：在 `express.json()` 之后增加专用错误层；
- `vendor/canvas-agent/src/server/codebuddy-http.test.ts`：断言改为 4xx 且不回显解析器内部消息。

原 [`vendor-current-manifest.json`](vendor-current-manifest.json) 捕获于
`2026-11-08T17:05:49.056Z`（`sourceHead` = `cc222004d8b3104357854d9c6b7a331d0c52a869`），
其对应两条记录自本轮修复起失效。按 `C-FACT-03` 历史证据不改写，此处以新记录追加
`supersedes`，不修改原清单数值。

| 文件 | 原记录 bytes | 原记录 SHA-256 | 当前 bytes | 当前 SHA-256 |
| --- | --- | --- | --- | --- |
| `vendor/canvas-agent/src/server/http.ts` | 46270 | `bab636f7016203a2c0921f65af0362888dfa18c5b778c7b828a3dc093b727102` | 47030 | `a30e3defe2ca38806b25ab8af4cd712d010313f76e27d35c2850c1d408a959dd` |
| `vendor/canvas-agent/src/server/codebuddy-http.test.ts` | 7056 | `9dfa3144a385b1c451361b46185fee34a88ca98300768b3906e806f216e36b46` | 8723 | `eb23efdfdc2782c2216e55bb255705aa19e8833bd2aa995a63f4879af7cdf6de` |

## 需在本轮合并前处理

1. 原清单中 `codebuddy-http.test.ts` 条目的 `bytes`(7056) 与其 `sha256` 所对应的
   实测文件长度存在偏差（`UNKNOWN`：疑似 11-08 之后该文件被改写时只更新了 SHA-256，
   未同步 `bytes`）。因此 `bytes` 字段不可单独作为完整性依据。
2. 合并前应以**实际文件**重新生成完整清单（101 项），并把新清单绑定到新的 head SHA；
   本记录只覆盖上述两条，其余条目仍沿用原清单当时含义。
3. `review.md` 中记录的 6 份文件 SHA-256 是 `df597194` 快照的历史证据，不追改；
   本轮修复后的 diff 必须由独立上下文重新绑定 base/head SHA 审查。
