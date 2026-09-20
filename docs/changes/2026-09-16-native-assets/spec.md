# Native Assets Spec

沿用 T3 已授权 Local First 方案。采用现有 assetRepository 门面加 Desktop/Web adapter，UI 不散落平台判断。不引入服务器，不自动迁移历史归档或现有 IDB。

1. Desktop 原件保存在 dataRoot/assets/blobs/<sha256>；非敏感元数据保存在 assets/records/<assetId>.json，version=1。原件内容寻址、写后校验、临时文件sync/replace；同内容复用，来源合并保留最早AI provenance。
2. IPC：asset_store({dataBase64, metadata}) → metadata；asset_read({assetId}) → {metadata,dataBase64}|null；asset_list() → metadata[]。native重新计算sha256并确认assetId=asset-<前24hex>，验证mime与大小<=100MiB，拒绝路径穿越/不受支持mime/秘密字段。metadata不保存preview/data URL。
3. 前端公开 storeGeneratedAsset/loadStoredAsset/listStoredAssets 维持现有调用接口。native读取后仅在内存构造data URL；Web IDB保持可用。UI本地上传限制明确保留（聊天8MiB、图片10MiB），100MiB仅为仓库上限，不混为统一产品上限。
4. 新归档素材采用项目引用：Desktop保存时对于有效assetId的图片preview/result.src与attachment.dataUrl，校验归档内容吻合后从耐久快照省略媒体字节；读取时按assetId恢复内存媒体。旧有内嵌媒体仍可读取，但不自动搬移到原生仓库；找不到原生asset且已有内嵌内容时保留它。新引用缺少原件或hash错误必须报告，禁止静默用空媒体继续保存。
5. 包含homeDraft、project.attachments、composerDraft、task.attachments、item.assetId。音视频poster不能用原始视频字节替换；本轮只剥离确定同源的图片preview和result.src，未独立归档的poster保留原样。demo保持source=demo和原有相对fixture链接。
6. 发送Provider前引用附件必须有实际媒体字节；禁止无dataUrl时静默过滤成文生图。`assetId`的库导入映射必须一致。
7. 所有验证使用隔离合成数据。新WebView profile +同native dataRoot重新打开后，图与原图hash相同；缺原件时进入保护。测试本地服务/mock不能算真实Provider成功。
8. JSON草稿仍是恢复材料；含原件的完整portable项目包未在本单元完成。原生素材异常不能误标归档成功。

