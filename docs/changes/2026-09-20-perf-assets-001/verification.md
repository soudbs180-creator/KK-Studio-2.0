# Verification

- ID：TASK-PERF-ASSETS-001
- 基线 npm ci/typecheck/lint 已通过。当前 lint/build 与素材定向7项浏览器回归通过，0 retry；Rust 61/61，通过cargo fmt。
- 新浏览器用例：125份2,348,050字节原件（总293,506,250字节）；打开素材面板前原件读取数为0；40项页、第二页、末页关键词搜索、320px WebP和详情SHA-256一致性通过；损坏原件不显示原图，恢复后键盘/详情重试通过。
- 初次错误恢复用例因卡片不在可见区未触发懒加载，补真实scrollIntoView后通过；没有取消惰性加载或放宽业务断言。
- Rust追加125条记录和临时文件用例：全量list不截断、各页无重复/遗漏、单页限100、损坏原件仍在读取/完整校验时拒绝、丢件页失败。
- 命令：npm run lint；npm run build；Playwright asset-performance.spec.ts + asset-storage.spec.ts --workers=1 --retries=0；cargo test --no-default-features --locked；cargo fmt。
- 当前production preview为http://127.0.0.1:1423/，运行入口src/main.tsx→App.tsx→useAssetArchive→AssetPanel→AssetCard，构建产物index-CXZIqqFj.js。最终集成bundle与三模式证据由TASK-MAIN-CLOSE-002更新。
- 限制：本次是125项约280MiB的功能与有界读取验收，不是所有设备/万级库容量保证。新生成会话/画布快照仍可能含完整预览；永久缩略图和同步大快照瓶颈留在PERF-001。

- 补审修复：非图片MIME在预览读取前返回（Node回归通过）；Web直读绑定id/metadata/SHA；图片解码错误、详情键盘回焦、视频与音频真实媒体控件均有browser回归。最终定向7/7，0 retry。
- 剩余性能边界：单件图片仍完整读取/hash/Base64，100MiB单件可能产生较高临时峰值；不能中断已进入平台的原件IO/哈希，但取消/切换不会提交过期UI。重读保守保留已有条目，外部删除不自动清理列表；原件丢失在实际读取时明确失败。
