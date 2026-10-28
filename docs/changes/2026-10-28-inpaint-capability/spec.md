# P2边界与验收

依据执行规范§7/17-P2、ADR-010/026/028及FEAT-035。前端DOM、JSX/样式、编辑算法、任务九态、存储key与原件身份不改；本次是内部派发接线，无新UI设计，当前Figma无修改需求。真实UI同态由同状态DOM/截图和旧浏览器回归核实。

注册表提供register/unregister/list/resolve/run；清单用P1 schema，拒绝重复、非法权限/版本/schema引用；uses注册时检测图环，前向引用在resolve时缺失拒绝。解析按能力版本范围、适配器兼容/优先级、平台/特征/资源可用性选定；禁用不绕过，不满足权限不调用executor。显式fallback仅用于派发前不可用，必须有回退事件接收方；executor出错后不自动回退/重发，防止已受理任务重复计费。注册表只存清单/函数，无队列、任务状态或存储。

image.inpaint在准备好的持久任务交给原运行时的边界接入：输入是projectId/taskId引用，原CreationTask由可信宿主上下文提供；不能由JSON替换任务身份或载荷。executor只经TaskPort.submit交回原生命周期，返回原任务ID。注入本试点实际需要的Pick<TaskPort,submit>，不伪造未用的订阅/恢复/Provider实现。AssetPort/ProviderPort映射到原任务运行时内部资产/Provider函数，仍由原运行时控制；P3a全面Port化不在本卡，不把此薄包装称为所有算法已迁出。

开关关：原提交路径。开关开：在读取最新项目/一致性检查之前lazy加载注册器，避免提交前产生新的异步竞态；原commit→flush→post-save安全检查→onAccepted→execute顺序不变，submitLock等待整个调用。无自动错误回退。性能标记kk:capability:image.inpaint仅在实际注册器派发时写入，无prompt/密钥/存储数据，不进DOM。

## 当前调用链与Port映射

CanvasImageCommand→useImageCommandSubmission.resolve/prepareImageTask→image-edit.prepareEditInputs（原件读取/裁剪/蒙版归档）→appendTaskSeries→本次派发边界→原commit/flush/审批/useTaskExecution→generateImages/nativeTaskHost→composeEditResult/storeGeneratedAsset→原保存/恢复。

| Port | 原函数与责任 | P2边界 |
| --- | --- | --- |
| TaskPort.submit | append后原commit/flush/postSave/onAccepted/executeTask闭包 | 实际注入submit；原Task对象、ID/幂等和批次不变，未建第二队列 |
| AssetPort.read/write | loadStoredAsset/storeGeneratedAsset/nativeAssetAdapter，prepareEditInputs/composeEditResult调用 | 原Runtime继续拥有，保留sha/parentId/origins；本试点不额外下载或再归档 |
| ProviderPort | prepareImageTask/providerSubmission、generateImages/createGenerationAdapter/nativeTaskHost | 原Runtime保留凭据/健康/租约/审批和受理语义；注册器不越过它另调HTTP |

契约包增加版本匹配/排序函数与任务引用schema，minor1.1→1.2，避免R5切片直接依赖semver/Zod；原任务/资产定义不改。Desktop/Web共享接线patch47→48，Mobile源码43不变，仅同步契约file-lock。

验收：注册表正反例/图环/版本/禁用/权限/回退与原件身份绑定；旧image-edit.spec.ts双构建（默认关/开）；同输入同任务/资产/HTTP/parentId/origins、同状态DOM与PNG对拍；R5及快速门禁、构建/主入口gzip测量。真实Provider、Tauri安装、独审/main与P1-G不能由fixture代替。

原image-edit基线在未改代码的fe99源码上14 pass/1 fail，唯一窄屏入口被HUD拦截（browser-baseline.log）；原断言保留并与两路径分别报告，不用跳过/force/放宽掩盖。P1严格依赖声明URL限制继续保留。
