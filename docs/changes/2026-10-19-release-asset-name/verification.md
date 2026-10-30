# Verification：公开下载名

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：IN_PROGRESS / NOT_VERIFIED；日期：2026-10-19。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-download-asset`；base：`0cc3b4ed116d71062244e3097285a2b532de8f97`；最终 HEAD 及其完整验证以本 PR 的精确提交和外部回执为准，不将 dirty 预检称为提交后门禁。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

独立只读诊断已实测现存公开 Release：同 tag 的 dot 资产地址匿名 GET 得到 302，唯一替换为 `%20` 的地址得到 404；GitHub 官方资产 API 文档和 gh 维护者说明确认服务端规范化。不是以尚不存在的 KK42 地址 404 推断问题，也没有创建测试 Release 或上传 dummy。

规则依据：[GitHub REST 官方资产文档](https://docs.github.com/en/rest/releases/assets#upload-a-release-asset)、[gh 维护者的直接复现](https://github.com/cli/cli/issues/10585)。独立诊断 `release-asset-filename-readonly-diagnosis.md` SHA256 `9370ef634e10695a213cd82da7eda748c38ffd104dda6334a9bd7537f7b446c9`；其中推荐保留 download 属性的旧展示名是备选建议。本修法经调用方核查，现有导出仅供设置页使用，因此直接将公开 filename/href/download 一并改为 dot；本地 NSIS/receipt 不消费该 UI 常量。

| 检查 | 实际结果与证据边界 |
| --- | --- |
| 旧 production build | base0cc、原共享常量，`npm run build` exit0；1423端口空闲，Playwright自身严格启动preview，Edge1920×1080 |
| RED | 仅将现有browser用例预期改为公开dot名，workers1/retries0；exit1，精确在href断言收到`KK%20Studio`而预期`KK.Studio`，尚未点击下载；报告run `5be28449-c828-4dac-8c74-e3c6190ae33c`；原log SHA256 `1afdc6b15aed75be4c8f99b710843c302f2e13130401d8d29724787eb6125a6d` |
| 最小修法/GREEN | 只改共享filename常量并加原因注释、同步Desktop预期；fresh production build exit0，同一browser用例1/1首过、workers1/retries0、下载/页面/版本/Agent说明全部原断言保留；报告run `2d83c03c-7b34-4cf5-b7cf-a8f6e6a94b3d`；log SHA256 `da6f040a878064e69b199f829ee495c28465a1434b45794d4e2040b5245d60a7` |
| 相关静态检查 | `npm run typecheck` exit0；三个代码/测试文件的Prettier check通过。新旧主入口gzip均237.16kB；无依赖/组件/样式新增 |
| 当前完整门禁 | 提交后精确HEAD的完整verify、独审、Hosted/Delivery/Windows candidate及正常merge仍待；本表前项只是dirty相关实证 |
| Native实际URL | 正式包安装后由外部 `installed-acceptance-42-release-url.mjs` 精确断言dot href；实际NOT_RUN，不借Web回归代填 |

42 标签、正式安装包、默认资料安装和生产交付仍 NOT_VERIFIED。原 35 push 首败/UNKNOWN/nonblocking/strictfalse及 e43 两 flaky、d965候选安装首败与顺序修法实证保持原义。0cc的原主线CI继续自然结束、保存其自身raw；本真实下载修复使其不再是最终tag来源，不取消或重跑它来掩盖信号。见前阶段验证及工程外原始收据。

## 4c 精确门禁与新实际失败（后续事实）

4c313633d88f4e2203292540ef7c83f77ae699af/tree f84dc69d0f80c1039bd5d6a2400142cf27747c63 的源码独审PASS_SOURCE_REVIEW_ONLY（收据SHA256 `6bcf3760a807b5414c1e33b0ef1daddbbdab445b041aaf8c2c51794e6a49fbbf`），完整本机verify自然exit0：Node1952/20SKIP、Agent204/2、Browser838+Design8首试通过、Design单元41、Development4；独立本机收据SHA256 `be1a915a10dcfafa865e9cf4e124d40d6c7b217120e824cd92035046d4895d07`，SSR警告10条保留。该事实补充前表的准备时点，不代后续head。

push quality39167031850实际FAIL：838unique/840attempts，836expected+1unexpected+1flaky；sidebar reduced-motion首次line74点击展开按钮30s超时，retry于createFolderOnce的folder count断言5s收到0；settings390首次helpers141设置按钮点击30s，retry通过。Node1953/19、Agent204/2通过；Design/Rust/Native未执行。raw SHA256 `18a1987580d483b813d56a16557ed960b819d28bb91e3b88573a16bb006acc81`，原失败、strict=false保持，未rerun。PR quality仍自然运行；Windows候选39167333211及双Mobile各自已证通过，不代失败push。

独立下载官方artifact12151741112/verification-evidence（39017880B），完整ZIP SHA256 `9db9932d436f9253f3aacc5e0234d94b30b2d476bf6b61e47197d1ae70d306e2`、467项CRC/安全通过，实际JSON/errors[]与3context保留。两个首试无Page snapshot、trace/失败截图，stdout/stderr为空，不能推断DOM blank。sidebar retry快照为展开侧栏、结束时按钮enabled、folder0、无未就绪告警；**点击瞬间的disabled状态和云端具体首因仍UNKNOWN**。

独立受控对照仅在自有Edge空context、固定1423 production preview、保留的4c dist上延迟creation IDB onsuccess：旧visible-only按钮disabled而命中true，一次physical click只有pointerdown/up无click；释放读取后按钮enabled，但原folder count5s仍0。先等既有enabled状态的变体，在同坐标一次click后原count1/expanded/scrollLeft0均通过，无running动画/pageErrors/外部请求。自有浏览器已关闭、preview以SIGTERM退出，未写source/dist/原profile。报告 `independent-4c-push-triage/sidebar-mechanism-1792359778564/report.json` SHA256 `c81ea4db4bd8ee9ad42d522bdf14a3f617250c9c8a1a0e51bdcbe791d9c2a370`。这是已证测试前提缺口，**不是已证云端根因**。

修正仅createFolderOnce的visible后增加toBeEnabled，保留物理命中/一次点击/所有原动画、count、expanded与scroll断言，不改产品、settings测试、timeout/retry或存储保护。现有sidebar4+settings3 workers1/retries0共7/7首过，日志 `sidebar-enabled-precondition-targeted.log` SHA256 `9666c636fb85687528b4f4ec6ae19356ff7a1afce9c4ca8a1bfb1174ef8cadcf`。本次实际维护的新精确head完整verify、独审、Hosted及正常merge仍待，原4c门禁结果不挪用。
