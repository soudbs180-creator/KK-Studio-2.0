# 声明与Port设计

依据外部执行规范§4.3、§7.1、§17-P1及补篇A2；以[MODULARITY](../../architecture/MODULARITY.md)为现行规则。原包纯TS/ES2022、types=[]，Mobile通过file依赖消费；保持此平台边界。

- 保留wire.CapabilityManifest（供应商modalities/operations）及所有旧导出；新业务类型命名BusinessCapabilityManifest，Zod出口capabilityManifestSchema。
- Manifest含稳定id、严格semver、title/kind、input/output schema key、permissions/modelTraits/resources、adapter id/kind/priority/compat、task进度取消恢复/正时间预算、lineage、uses/fallback、enabled/card，补platforms/degrade。结构严格拒绝未知字段；不存函数、Zod实例、密钥或用户数据。默认数组/开关只适用于新manifest，不回写旧数据。
- ID沿外部格式；network权限只允许明确hostname（含localhost/IPv4），不接URL/通配授权；权限schema只是声明校验，P5仍负责授权/旧Skill兼容。版本/范围用成熟semver，范围合法且至少一个adapter支持当前契约包版本；可保留旧版适配器，P2解析必须逐个筛选兼容者；不手写semver解析器。schema只检查uses重复/自身依赖，跨manifest环/缺失/实际resolve仍由P2测试，禁止本卡实现注册表。
- fallback为明确id@semver；adapter id须归属本能力且唯一；card限docs/features/feat-*.md相对路径。文件是否存在由后续治理检查，不让纯包读取文件系统。
- 三Port仅interface/type。TaskPort接收既有CreationTask并经原队列提交/订阅/取消/单输出重试/恢复；取消请求不等于供应商确认。AssetPort复用StoredAssetMetadata/AssetProvenance，按ID读取含原件data URL的既有preview，写结果沿既有source/parentId/model/promptHash等字段，origins由原仓库保持。ProviderPort解析模型/资源及可选协议族，再提供现有submit/getStatus/cancel/listResults形状；只传路由/凭据引用，不定义密钥存储。AbortSignal/Blob/React/Tauri/Node内置类型均不进入接口。
- 包1.0.0→1.1.0（兼容增量）；新增contractVersion.ts在index与schema之间共享版本，避免循环导入。包自身声明Zod4.6.7 MIT、semver7.8.5 ISC，TypeScript6.0.3仅开发依赖，@types/semver7.8.0 MIT随纯TS源包供独立消费者解析类型。根Zod安全补丁仍在独立候选，不顺带升级根/Agent。

仅本次用户明确的三个Port落地；StoragePort与PermissionPort保留原阶段归属。P1-G可选capabilityId/治理单独提交、ADR③正式采用、统一错误/JSON Schema投影、注册表图环与适配器选择均不能因两文件完成自动关闭。ADR③在本卡记录草案与后续门槛。

## Port到现有实现的前置映射

| Port | 已查来源 | P2装配责任 |
| --- | --- | --- |
| TaskPort | imageTaskCommand.appendImageTask、useTaskExecution.cancelTask/retryTask、nativeTaskHost.reconcileNativeTasks、taskRecovery | 原队列提交后返回既有task；subscribe由原creation快照公开通知；审批与健康/幂等守卫保持；recover从现有快照适配，不新建状态源 |
| AssetPort | assetRepository.loadStoredAsset/storeGeneratedAsset/listStoredAssets、nativeAssetAdapter | 原件由现有仓库读写，保持assetId/sha256/preview/origins，调用方不再读私有存储 |
| ProviderPort | generation/providerAdapter及providerAdapterFactory、models/modelCatalog、providerSubmission | 保留原能力/连接/健康选择与受理边界；DOM取消信号由宿主适配，接口不引入DOM类型 |

比较过直接抽取宿主实现与增加新运行时，两者都会触及未验收链路或重复基础设施；本次选择既有叶契约包增量声明。所有签名为作者按现有函数裁定，P2接线前须用真实adapter编译/对拍确认，不把接口声明称为业务解耦已完成。

## 独立消费者类型边界

包原有tsconfig的lib=ES2022、types=[]、skipLibCheck=true不变。打包安装后的独立消费者按此同一配置类型检查及浏览器bundle运行通过；另做skipLibCheck=false、仅ES2022的更严格探针，Zod4.6.7自身schemas.d.cts的4处URL声明报TS2304。保留该失败，不补DOM全局、不修改node_modules、不改项目tsconfig，不宣称依赖声明全检通过。需要此严格无宿主环境的消费者目前不支持；后续须由上游类型修复或独立包装设计解决，不将此已知限制藏入绿色结果。
