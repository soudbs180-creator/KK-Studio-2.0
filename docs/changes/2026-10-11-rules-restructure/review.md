# Review

## 当前结论

`UNIFIED-PROJECT-RULES.md` 已覆盖用户要求的六个主题，并为每项裁决保留来源和验证方式。当前只完成协调者 self-review；独立 reviewer、PR/CI、合入后的 exact-head 回读尚未完成，结论为 `NOT VERIFIED`，不能写成已合入或远端生效。

## 复核重点

- 规则优先级和事实源不再依赖历史快照；
- 目录与命名表明确了现行格式、平台例外和 legacy 过渡；
- `verify` 与 Rust/Desktop/Hosted/Provider/发布边界分开；
- 旧规则均通过“原规则 → 新规则”表保留迁移理由；
- 新规则要求规则/代码/生成视图/证据同步并可由脚本复核。

## 后续阻断项

合入前需要独立 exact-head review；合入后需要重新生成 `PROJECT_STATE`/`PROGRESS`、回读 `origin/main`、验证入口文档已变为唯一路由，并按第 10 节采用清单完成迁移。
