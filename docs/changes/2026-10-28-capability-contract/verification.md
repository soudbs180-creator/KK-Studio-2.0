# P1 实际验证

状态：声明与三个Port已形成候选；整体PARTIAL，未接入口、未合main、独立审核NOT_VERIFIED。base5240e7b3dd17e33a5ec749d2e62ec18ca3c53dbf，branch feat/TASK-MOD-P1-capability-contract；复用原隔离树，日志均归容器output/p1-capability-contract-2026-10-28。

## 实现与兼容

新增capability.ts、ports.ts及共享contractVersion.ts；index公开出口，保留旧wire.CapabilityManifest及其他导出。包/常量/自身lock1.0.0→1.1.0；Mobile file-lock只同步该包的版本/依赖元数据。应用版本仍Desktop/Web2.1.47、Mobile2.1.43；根/Agent依赖与src、原任务/资产文件未改。

## 实际命令与结果

| 检查 | 结果与证据 |
| --- | --- |
| 旧包npm run typecheck --prefix packages/creation-contracts | PASS，baseline-contract-types.log |
| 契约RED | contract-red.log：12项失败，缺新schema/Port出口；不是用环境错误代替功能RED |
| 兼容边界RED→GREEN | mixed-compat-red.log：有当前适配器时仍应允许保留旧适配器；最小改为至少一项兼容。权限类型反例permission-type-red.log捕获字符串分支放宽，改Zod templateLiteral保持network前缀类型 |
| 最终契约 | node --test tests/unit/capabilityContract.test.ts：13 pass/0 fail，contract-final.log；含权限/非法manifest/版本/adapter/局部uses/预算与正负类型夹具 |
| 根快速三门禁 | typecheck/lint/npm test均exit0；单元2358项，2338 pass/0 fail/20 skip。gates-final.log、tests-final.log、test-exits-final.json |
| 包类型/格式 | 原ES2022/types=[]配置加noUnusedLocals/noUnusedParameters通过；根与包全部TS/JSON格式通过 |
| R1–R8 | 405/11/10/16/0/2/0/0，0新增违规；未扩大基线。根lint显式GOVERNANCE_BASE=5240e7b3dd17e33a5ec749d2e62ec18ca3c53dbf，只证明父候选上的增量，不代表main bootstrap/合流已通过 |
| Mobile | npm ci --prefix mobile --ignore-scripts后，npm test --prefix mobile为373 pass/0 fail/0 skip；npm run typecheck --prefix mobile（应用/测试）通过。已核实file依赖真实路径指向当前工作树包 |
| 独立消费者 | npm pack→新目录安装tarball及TypeScript，无宿主依赖；按包自身tsconfig继承配置类型检查exit0；browser-platform bundle后运行、旧供应商类型及未知任务拒绝重试等断言通过。pack-final.json、consumer-project-final.log、consumer-runtime-final.json |
| 无宿主全局的运行探针 | 同一安装包browser bundle在纯ES VM中运行，明确无URL/process/window，网络权限声明可解析，非法权限拒绝；consumer-sandbox-final.log。此为纯运行探针，不冒充浏览器UI或设备验收 |
| 根生产构建 | npm run build exit0，build-final.log；前后dist全160个文件sha256相同，app-bundle-comparison.json。未接上层运行逻辑的产物证据，不等于Tauri/Hosted验收 |

## 单独保留的失败与限制

- 独立消费者额外使用skipLibCheck=false、仅ES2022时，Zod4.6.7的schemas.d.cts第194/196/199/200行引用全局URL，4处TS2304，exit2。consumer-strict-final.log与consumer-exits-final.json保留；不添加DOM/Node环境、不改项目tsconfig、不修改node_modules。另一个继承原包skipLibCheck=true的项目配置成功，不能据此宣称严格依赖声明全检成功。
- 此限制目前阻断上述更严格消费者配置；现有根/Mobile项目检查通过。独立消费者和VM运行证明当前schema运行不依赖这些宿主全局，不能替代上游.d.ts修复。已记录TASK-MOD-P1-TYPES跟踪。
- 保留5处历史版本文案与CHANGELOG漂移警告、build large-chunk警告；Mobile安装有既有eslint弃用警告，Node测试有既有模块格式重解析提示。没有为本卡修改这些无关依赖/配置。
- 本卡没有重跑完整verify、Agent/原生安装/Hosted/真实Provider；父候选浏览器与main分叉问题仍开放。P1-G治理字段、StoragePort/PermissionPort、P2跨manifest图环/实际适配器筛选/双路径对拍未实施，不能用本次两个契约文件代表整份P1或四文档完成。

最终提交、全输入指纹、打包sha256、主checkout21个dirty文件和四份来源保护校验单独记录到容器回执。所有失败日志按原结果保留，不把作者自审写成独立审查。
