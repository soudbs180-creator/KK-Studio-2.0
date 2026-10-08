# Review：TASK-PLUGIN-DEV-001 源码与当前证据

- Task ID：TASK-PLUGIN-DEV-001，关联 TASK-PLUGIN-RECOVERY-001 / TASK-PLUGIN-MARKDOWN-001。
- Reviewer/context：`/root/mask_final_doc_review`，独立只读 AI 审查上下文；未修改候选产品、测试、版本、账本或 Git。
- 时间：2026-10-09，Asia/Shanghai；本轮30项定向测试实际时间为2026-10-08T19:27:24.4110898Z–19:27:24.8351146Z（本地03:27:24）。报告保存的实际UTC时间见末次观察。
- Base SHA：`8c921a525ae505a558b0efee641830f1d61166fa`。
- Exact reviewed head SHA：`dc3c03eb316f3009c939dc33f25d78c4a2acd576`；父提交 `3c8b962f1fb678b068c9ed57e507406507e63364`。
- Branch：`fix/TASK-PLUGIN-DEV-001-same-origin-modules`。
- Worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001`。
- 已读取当前 AGENTS、AI_RULES、docs/engineering/REVIEW、SDLC/BRANCH-POLICY、intent/spec/plan/verification、当前治理入口及实际受影响实现和测试。规则内容与此前同仓库读取版本一致，实际 blob 如附录。
- 工具：PowerShell、只读 Git、Node `v24.21.0`、React `18.3.1`、TypeScript VM 转译、esbuild `0.25.12` 的 `write:false` 内存构建。
- 原始证据目录：`D:/kk-studio/.verification/TASK-PLUGIN-DEV-001-20261009`。
- 本报告只绑定 dc3；后续83639e7及其它driver提交须新补审。后续修正和动态结果不能改绑本原始报告。

## 评审范围和方式

对 base → dc3 的30文件实际diff审查，重点核对同源插件加载、React JSX静态/动态children语义、snapshot完整保留与输入拒绝、marked精确版本随包、CI guard，以及新native driver实际保存/停止/重启/坏数据保护逻辑。读取现有原始RED/GREEN、完整verify、development、Rust/client/fresh build日志；另外独立执行30项相关单元检查和三个有界隔离探针。

不进行产品修改、版本/任务账本更新或Git操作，不创建审批、不触碰用户数据、快捷方式或真实Provider。不启动完整app、Vite服务或native验收；唯一实际子进程终止是本审查创建的独立Node计时器子进程。SDK重建仅内存输出，不调用会写入dist/public的sync插件。

普通沙盒此前不能创建PowerShell安全环境，require_escalated仅解决启动问题。两个只读内存/身份探针首次自动审批超时，按工具指示仅重试一次后实际完成；没有把未启动操作说成执行通过。原始输出读取曾因聚合输出预算被截断，随后用有界元数据摘要和完整断言结果完成核对；截断输出未作为成功依据。

## 已查范围与结果

1. **范围与版本。** Diff没有改Vite配置、Tauri权限或CSP；Desktop/Web 2.1.11 → 2.1.12，Mobile规划2.1.1。106个base任务中只改既有DEV对象，新增RECOVERY/MARKDOWN两个PARTIAL对象，总108项。两个直接相关缺陷保留PARTIAL等最终验收，唯一active实现任务为DEV，没有把外部/物理Mobile或整个产品标完成。准备文档中旧失败/旧状态明确是历史，不作为当前动态结果。

2. **同源导入。** 先由既有isBundledPluginUrl核对/plugins路径和浏览器origin，再将浏览器root-relative地址解析为当前location的绝对同源URL；Node没有location时保持旧测试路径契约，缓存戳保留。远程HTTPS/凭据/fragment/redirect拒绝分支未改，CSP的script-src继续self（原wasm-unsafe-eval未新增）、无blob/eval放宽。当前原始development收据绑定dc3、loader原始字节hash与当前源码一致，34个插件请求/响应全部同源200且无import query，无遮罩、零记录错误，启停/刷新/unsafe0断言在真实flow中保留。

3. **JSX桥。** jsxs仅对编译器确定的静态兄弟使用React.createElement位置参数；jsx的动态数组保留props.children语义，jsxDEV消费isStaticChildren。现有3个React18静态/动态/Fragment/key回归通过；本审查另用真实React18的创建元素校验，确认静态兄弟中的嵌套动态无key数组仍实际发出一次缺key警告，未屏蔽console或弱化动态校验。

4. **snapshot输入与clone。** codec在normalize之前校验已有plugin字段：非空type、可选string version、正有限width/height、string content、递归JSON metadata和未知JSON扩展。rejectSecrets先行，坏payload不会被归为空卡片；load将writable/ready设false，只有完整decode/hydrate成功才允许写入；async persist仍decode验证后才调用native/IDB写。normalize保留plugin并structuredClone深复制，未改schema version2、存储身份、permission或引入第二状态源。长内容/JSON扩展/坏字段/非JSON/secret/原输入不变的新增6项回归及旧snapshot/asset回归通过。本审查额外对50,000字符、多层JSON、未知type/version和普通JSON的__proto__键核对完整保留、非共享引用及无prototype污染。

5. **marked随包与产物来源。** markdown.workspace明确依赖14.1.4，lock的版本/registry/integrity与原始marked-version.json一致，已安装14.1.4；解析调用保留同步契约async:false、既有缓存与宿主React单例。原隐式esm.sh/marked@14导入和无效类型声明删除，未改主版本。四插件按原esbuild配置write:false内存重建，逐字等于public/plugins与dist/plugins当前实际字节；四份均无esm.sh。原offline RED中标题为空/dynamic import pageerror保留，随后development真实四插件正文/编辑/刷新/启停PASS；生产浏览器新增两项要求实际IDB恢复及坏主件/backup完整一致，没有只依赖localStorage。

6. **CI和driver验收内容。** package.verify在现有full verify之后加入test:development；质量CI实际调用npm run verify，固定1421 strictPort、HMR遮罩照常、端口占用/加载/console错误都失败，没有隐藏Vite错误或复用服务。native driver使用独立data/profile、核对get_storage_root、同源CSP/module资源和EXE SHA；通过真实UI编辑四插件、轮询原生磁盘保存，再重新spawn同EXE读真实磁盘；坏plugin.width=0后内存草稿/重新读取，要求主件/backup字节不动，最后恢复原fixture再读四内容。但其dc3停止逻辑有下述已复现验收阻断。

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLUGIN-REVIEW-001 | P2 | Native driver生命周期与验收 | merge-blocker：当前head无法提供计划要求的可靠原生重启验收 | tests/desktop/plugin-recovery.mjs:111–123（dc3）；下方隔离Node实际退出probe | stop只用exitCode!==null判断退出；同机Node24由审查者spawn自己的Node计时器后kill，真实exit事件code=null/signal=SIGTERM，exitCode仍null而signalCode=SIGTERM。原循环之后仍断言notEqual(null,null)，把已退出进程判为未退出，阻断后续重启/坏数据验收；不是已复现的产品数据丢失 | Root实现者；以真实exit事件、exitCode或signalCode判定，记录code/signal，保持有界等待及所有内容/原件断言；新head另复验 | **OPEN at dc3**。已向root发送实际证据；root已提交83639e7修正，后续原生及精确SHA补审另行记录，本报告不将dc3改为新head |

P0/P1：本次实际diff及有界检查未发现。P2：仅上述验收driver问题；没有将其夸大为产品存储缺陷。其它无证据的担忧不列作缺陷。

额外非阻断建议已送root：native corrupt阶段的pristine主件/backup最初仅在内存，首次变异前宜以wx保存原始字节副本和corrupt输入，便于失败后精确回读。后续提交已经加入副本保存，但不在本dc3结论中冒充已执行。

## 实际验证与原始证据

| 项目 | 本审查实际结果 / 核对结果 |
| --- | --- |
| git diff --check 8c921a5..dc3 | 本轮实际exit0，无输出 |
| Node --test pluginLoader / pluginJsxRuntime / pluginRecovery / snapshotCodec / snapshotAssets五文件 | 本轮实际30/30 PASS，0 fail/skip，exit0；完整输出见附录 |
| 独立自有Node进程exit语义probe | 本轮实际exit0；复现exitCode=null/signalCode=SIGTERM，证明finding |
| React嵌套动态key和JSON扩展probe | 本轮实际exit0，全部断言通过 |
| 四插件write:false内存构建对照 | 本轮实际exit0，所有源码/public/production字节相同 |
| 原verify-dc3日志及exit原件 | 本轮读取/哈希：实际exit原件0；root 794/802（原skip8）、Agent172/174（原skip2）、447 browser PASS，并有后续development dc3 PASS |
| 原Rust/client日志 | 本轮读取/哈希：Rust102/102及client check exit原件0；5个旧dead-code warning保留 |
| 原Rust fmt日志 | 原件0字节，只有空输出，**本审查未重跑fmt且没有独立exit原件，单凭空文件不另声称动态PASS**；root执行事实另由完整收尾补证 |
| fresh Agent Tauri build日志 | 本轮读取/哈希，实际release构建完成，EXE产生；未把build通过当native验收通过 |
| native最终验收 / 当前Hosted | 本报告没有最终PASS收据；不得代填 |

原始RED确实对应未修代码/working阶段：snapshot新6项4FAIL/2PASS→新增6+旧4的10PASS；JSX3项2FAIL/1PASS→SDK/loader15PASS；offline Markdown真实模块错误和空标题FAIL→四内容working/development dc3 PASS。早期错误SSR探针及端口占用失败不替代正确实际校验，也未从原件删除。

完整verify的447浏览器执行与本审查30单元属于不同执行者/不同范围，本报告没有声称审查者再次跑了全量suite。浏览器原reporter的attempt/retry字段本轮未独立遍历，不能仅凭447 passed推断所有retry次数；最终收尾若声明零retry需保留并检查原reporter。

## 适用门禁与结论

**CHANGES REQUIRED at exact dc3：PLUGIN-REVIEW-001阻断该head的原生重启验收。** 其余已查产品源码/输入/权限/包来源未发现新增阻断缺陷，有界独立检查通过。

当前完整native验收、production/native功能范围收尾、最新Hosted verify/delivery、真实审批/保护、普通合并/landing/main及用户最终产品验收均需要各自实际证据。后续driver修正已发生，但新head不能继承本报告的dc3身份；先对新diff和真实收据增量复验，再形成独立新结论。此报告不是GitHub approval，未创建或代填任何审批、合并或发布结果。

## 原始实际输出附录

### 30项独立单元测试（exit0）

```text
✔ plugin jsxs preserves static child validation, Fragment and element key (37.8004ms)
✔ plugin jsx retains validation for genuinely dynamic unkeyed lists (7.1861ms)
✔ plugin jsxDEV preserves the compiler's static-child distinction (12.4373ms)
✔ installFromUrl：求值工厂、登记节点、写 store 并激活 (15.8236ms)
✔ setPluginEnabled：禁用卸载节点与样式，重新启用恢复 (0.4243ms)
✔ uninstall：清 store 并卸载节点 (0.2582ms)
✔ ensurePluginsLoaded：rehydrate → 发现本地插件 → 只激活启用项 (0.6836ms)
✔ 随包插件从同源模块 URL 直接导入，不生成 blob 模块 (0.7923ms)
✔ update：带缓存戳重新拉取并替换版本 (0.5961ms)
✔ 无效导出被拒绝 (0.4396ms)
✔ 远程插件拒绝明文、凭据和片段地址，且不发起下载 (0.4933ms)
✔ 远程插件拒绝从 HTTPS 重定向到明文响应 (0.1683ms)
✔ 远程插件禁止自动重定向，避免中途经过明文地址 (0.1835ms)
✔ 旧版明文插件缓存不会在启动或重新启用时执行 (0.3247ms)
✔ deactivate 执行 setup/css 清理 (0.2202ms)
✔ all bundled plugin payloads survive repeated snapshot reads without truncation (8.3479ms)
✔ normalization copies plugin metadata independently of the source snapshot (0.1988ms)
✔ invalid plugin payloads are rejected before normalization preserves the original (0.9407ms)
✔ non-JSON plugin metadata, extensions and nonfinite dimensions cannot be saved (0.8841ms)
✔ nested plugin secrets are rejected without altering the input (0.3588ms)
✔ plain legacy canvas items remain readable without acquiring a plugin (0.175ms)
✔ 大于16MiB的已归档媒体用稳定引用保存并完整恢复，独立poster不被替换 (54.4353ms)
✔ 缺失引用不能被静默水合，旧内嵌素材不自动迁移 (92.3898ms)
✔ 内存媒体与assetId原件不符时拒绝剥离 (41.3197ms)
✔ 引用附件发送前恢复原件，缺失时不能降级为文生图 (0.3158ms)
✔ 引用与附件身份冲突时阻止发出另一张图片 (0.1341ms)
✔ 原生素材缺失提示保留可操作原因且不泄露原始错误 (0.7356ms)
✔ malformed members, duplicated identities and unknown versions cannot become writable empty data (3.9512ms)
✔ normalization may add defaults but cannot truncate existing content on read (0.8738ms)
✔ secret fields are rejected at browser and draft-export boundaries (0.1117ms)
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 372.1553
{"reviewBegan":"2026-10-08T19:27:24.4110898+00:00","reviewEnded":"2026-10-08T19:27:24.8351146+00:00","exit":0}
```

### 独立自有子进程退出语义（exit0）

```json
{"platform":"win32","node":"v24.21.0","code":null,"signal":"SIGTERM","exitCode":null,"signalCode":"SIGTERM","driverExitCodeNotNull":false}
```

### React动态key与JSON扩展隔离probe（exit0）

```json
{"node":"v24.21.0","react":"18.3.1","nestedDynamicListStillWarns":true,"warningCount":1,"validUnknownTypeAndVersionPreserved":true,"deepUnknownJsonExtensionsPreservedAndNotAliased":true,"longContentLength":50000,"inputUnchanged":true,"prototypeJsonKeyPreservedWithoutPrototypePollution":true}
```

### 内存构建与实际随包字节对照（exit0）

```json
{"platform":"win32","node":"v24.21.0","esbuild":"0.25.12","marked":"14.1.4","results":[{"name":"html","bytes":3547,"sha256":"d670b81f4fbc3b4136058e16e03873729f15c96e6e656b8418c5efc4b9192763","sameSourceBuildPublicAndProduction":true,"containsEsmSh":false},{"name":"markdown","bytes":39547,"sha256":"0ff3b4d051b6d218ff0f1adfa85f352e6a761b56a5fed7dfd839121a19a9c98b","sameSourceBuildPublicAndProduction":true,"containsEsmSh":false},{"name":"sticky-note","bytes":4240,"sha256":"448118d22c0cb53c5a5064daf664fb03cd9786eb923a221b2c1e728e2497e63e","sameSourceBuildPublicAndProduction":true,"containsEsmSh":false},{"name":"svg","bytes":3201,"sha256":"db9de5e48769b403b3f34692d5a42e835808391c0cb19c5d3d93bdfcdbf00a76","sameSourceBuildPublicAndProduction":true,"containsEsmSh":false}]}
```

### 原始suite/development/build证据元数据

```json
[
  {
    "name": "verify-dc3c03e.txt",
    "bytes": 159098,
    "sha256": "d49c6d8fbff9db1906682e60adf6564755939ff6319bd74e0f1522f963b02344",
    "summary": {
      "counts": [
        "Platform versions are consistent.",
        "Governance: 108 tasks, 0 violations.",
        "Features: 35 features, 0 violations.",
        "ℹ tests 802",
        "ℹ pass 794",
        "ℹ fail 0",
        "ℹ skipped 8",
        "ℹ tests 174",
        "ℹ pass 172",
        "ℹ fail 0",
        "ℹ skipped 2",
        "All matched files use Prettier code style!",
        "  447 passed (1.9m)"
      ],
      "tail": [
        "> node tests/development/plugins.mjs",
        "",
        "{\"result\":\"PASS\",\"sourceHead\":\"dc3c03eb316f3009c939dc33f25d78c4a2acd576\",\"steps\":[\"discover-four-plugins-without-overlay\",\"add-edit-and-render-four-plugin-nodes-without-cdn\",\"disable-reload-restore-enable\",\"reject-unsafe-remote-before-request\"],\"errors\":[],\"evidenceDir\":\"D:/kk-studio/.verification/TASK-PLUGIN-DEV-001-20261009/development-dc3c03e-verify\"}",
        ""
      ]
    }
  },
  {
    "name": "verify-dc3c03e.exit.txt",
    "bytes": 3,
    "sha256": "13bf7b3039c63bf5a50491fa3cfd8eb4e699d1ba1436315aef9cbe5711530354",
    "summary": {
      "exit": "0",
      "counts": [],
      "tail": [
        "0",
        ""
      ]
    }
  },
  {
    "name": "rust-test-dc3c03e.txt",
    "bytes": 20516,
    "sha256": "8daf4a3a20b721dafbd2d760c4f5a2492d235caec052e2cb33b508fc4a360f3d",
    "summary": {
      "counts": [
        "    Finished `test` profile [unoptimized + debuginfo] target(s) in 40.76s",
        "test result: ok. 102 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 1.88s"
      ],
      "tail": [
        "",
        "test result: ok. 102 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 1.88s",
        "",
        ""
      ]
    }
  },
  {
    "name": "rust-test-dc3c03e.exit.txt",
    "bytes": 3,
    "sha256": "13bf7b3039c63bf5a50491fa3cfd8eb4e699d1ba1436315aef9cbe5711530354",
    "summary": {
      "exit": "0",
      "counts": [],
      "tail": [
        "0",
        ""
      ]
    }
  },
  {
    "name": "rust-fmt-dc3c03e.txt",
    "bytes": 0,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "summary": {
      "counts": [],
      "tail": [
        ""
      ]
    }
  },
  {
    "name": "client-check-dc3c03e.txt",
    "bytes": 9156,
    "sha256": "ccd7da64994cd96ee0d873d92a101b26eeaf1e11120fd1d0d7b99f2b58ac750f",
    "summary": {
      "counts": [
        "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 40.52s"
      ],
      "tail": [
        "",
        "warning: `kk-studio` (bin \"kk-studio\") generated 5 warnings",
        "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 40.52s",
        ""
      ]
    }
  },
  {
    "name": "client-check-dc3c03e.exit.txt",
    "bytes": 3,
    "sha256": "13bf7b3039c63bf5a50491fa3cfd8eb4e699d1ba1436315aef9cbe5711530354",
    "summary": {
      "exit": "0",
      "counts": [],
      "tail": [
        "0",
        ""
      ]
    }
  },
  {
    "name": "fresh-agent-build-dc3c03e.txt",
    "bytes": 15155,
    "sha256": "5a8ee8be821a87e096be6519c813741be15dc6c249064a8a07c8e0869828c635",
    "summary": {
      "counts": [
        "    Finished `release` profile [optimized] target(s) in 1m 01s"
      ],
      "tail": [
        "warning: `kk-studio` (bin \"kk-studio\") generated 5 warnings",
        "    Finished `release` profile [optimized] target(s) in 1m 01s",
        "       Built application at: D:\\kk-studio\\KK-Studio-2.0\\.worktrees\\TASK-PLUGIN-DEV-001\\src-tauri\\target\\release\\kk-studio.exe",
        ""
      ]
    }
  },
  {
    "name": "development-dc3c03e-verify/receipt.json",
    "bytes": 6374,
    "sha256": "65b87cea19c5d55c1ab2f2dec781ff67532e55eb149e1b373ba26862566155b9",
    "summary": {
      "sourceHead": "dc3c03eb316f3009c939dc33f25d78c4a2acd576",
      "loaderSha256": "f1cbe8dc0bdf061a6ec201e7997c01c23e2998a03d178cb4723c3ec2fb69fb1d",
      "result": "PASS",
      "mode": "development",
      "entry": "src/main.tsx",
      "url": "http://127.0.0.1:1421/",
      "startedAt": "2026-10-08T19:22:19.575Z",
      "completedAt": "2026-10-08T19:22:24.779Z",
      "steps": [
        "discover-four-plugins-without-overlay",
        "add-edit-and-render-four-plugin-nodes-without-cdn",
        "disable-reload-restore-enable",
        "reject-unsafe-remote-before-request"
      ],
      "errors": [],
      "overlay": "",
      "requests": 34,
      "responses": 34,
      "all200": true,
      "allSameOrigin": true,
      "anyImportQuery": false
    }
  }
]
```

### 任务/版本/规则blob与loader身份（只读exit0）

```json
{"baseTasks":106,"headTasks":108,"changedExistingTasks":["TASK-PLUGIN-DEV-001"],"added":[{"id":"TASK-PLUGIN-MARKDOWN-001","status":"PARTIAL","branch":"fix/TASK-PLUGIN-DEV-001-same-origin-modules","worktree":"D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001","verification":"PRE-EXISTING FAILURE：共享4插件编辑flow在真实开发阻断esm.sh时Markdown标题为空，页面console net::ERR_FAILED及dynamic import pageerror；原receipt/PNG/日志保留FAIL。当前尚未修复。 当前预验收快照10/10和固定1421四插件编辑/正文/刷新恢复/启停/零错误通过，仍需完整verify、fresh Tauri和当前独立审查；历史FAIL保留。 实现及局部复验完成，最终验收未完成；作为同一逻辑目标的关联缺陷串行由唯一active任务TASK-PLUGIN-DEV-001执行，不创建第二个并行写入者。"},{"id":"TASK-PLUGIN-RECOVERY-001","status":"PARTIAL","branch":"fix/TASK-PLUGIN-DEV-001-same-origin-modules","worktree":"D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001","verification":"PRE-EXISTING FAILURE：最新main8c组合的真实开发回归创建四插件成功，重启并打开唯一保存项目后找不到HTML插件节点；页面零错误/无遮罩。源码normalizeCanvasItem未返回plugin字段，当前尚未修复和独立验收。 当前预验收快照10/10和固定1421四插件编辑/正文/刷新恢复/启停/零错误通过，仍需完整verify、fresh Tauri和当前独立审查；历史FAIL保留。 实现及局部复验完成，最终验收未完成；作为同一逻辑目标的关联缺陷串行由唯一active任务TASK-PLUGIN-DEV-001执行，不创建第二个并行写入者。"}],"versions":{"schemaVersion":1,"desktop":"2.1.12","web":"2.1.12","mobile":"2.1.1"},"loaderMatchesReceipt":true,"rules":{"AGENTS.md":"0771bc63c13276fbe12f4deea92a1add7befaa22","AI_RULES.md":"a39b009e1efb55531b59bdf39debf9dc42bfc9b0","docs/engineering/REVIEW.md":"08ce14fb5033758c38de9125f9f80625cdb87914","docs/engineering/SDLC.md":"9e25f86d2dd78e5037be93e82f46f57e3c1ef1a3","docs/engineering/BRANCH-POLICY.md":"17cf364ac5f46e95b5886f34a24710e19552cb4f"}}
```

## 保存时只读Git观察

{
  "utc": "2026-10-08T19:39:36.096Z",
  "currentHeadAtSave": "0260ece79daedd84098d135044026ad25e9162c6",
  "reviewedHead": "dc3c03eb316f3009c939dc33f25d78c4a2acd576",
  "status": "",
  "postDc3DeltaPaths": [
    "docs/changes/2026-10-09-plugin-development/verification.md",
    "tests/desktop/plugin-recovery.mjs"
  ]
}
