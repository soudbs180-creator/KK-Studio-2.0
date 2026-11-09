# 契约与验收

1. 现有 .kkproject ZIP 导入导出及引用限制保持。选中的有界 JSON 按 Companion protocolVersion=1 清单读取；严格 JSON 禁重复字段，清单字段白名单、校验和、revision、大小/总量/条目上限及路径白名单先验证。
2. 仅允许 projects/creation-v2.json、assets/records/asset-<24hex>.json、assets/blobs/<64hex>。禁止重复/大小写碰撞、越界、符号链接/重解析目录和文件。源只读，不创建目录或轮转备份。
3. v2/v3 快照经现有 Native validator 与秘密/引用校验；保留原始 Value，不经过会丢字段的转换。导入后使用原生现有 v2→v3 归档迁移，v3 保持。
4. 所有合法裸 metadata 和 blob（包括未引用素材）都进入现有 Native AssetRepository。assetId/SHA/size/类型/来源字段校验、完整引用、孤立 blob 缺记录明确失败。Native 必填 provenance/generatedAt 缺失则 unsupported，禁止伪造或放宽 Native schema。
5. preflight 不写入；import 每次重读校验，目标必须不存在。失败/故障不发布目标或遗留本次暂存，源所有字节不变；成功目标经过快照/原件读回与 Native 权威准入。
6. Desktop 现有选择项目包对话框允许 JSON；导出仍仅 .kkproject。取消/错误不进入恢复。Web 操作边界保持。此轮不证明实时共仓、真实外部模型、干净机/签名或完整产品视觉。

验证使用真实 CompanionStore.createBackup 生成的合成 v2/v3 fixtures；不会读取用户真实聊天/密钥。旧来源不完整的合法 Node 数据有界拒绝并保留原件，后续需明确的来源补录方案。

fixtures 通过当前 CompanionStore 的 stageAsset→publishStagedAsset→writeSnapshot→createBackup 生成，时间固定 2026-11-09T00:00:00.000Z。两份各一引用 PNG、一未引用 GIF、完整 provenance/origins；Node 独立恢复和源哈希保全已自检。生成脚本与全哈希在容器 output/storage-transfer-20261109/generated-fixtures，测试不依赖该绝对路径。manifestSha256：v2=1def1a02d17e1aedc9cb7eacf34eeaab4541c2c1aea37ed3a5066840896dbf06；v3=2d2d6e2674c649b31733d1f4f0a14041b62b4eaa1fdc13abf1dedefcdba214e1。
