# P2实际验证

PARTIAL：注册器与默认关闭接线已实现，数据/DOM对拍通过；原窄屏失败、严格PNG零差异、独审/原生与主线合流未关闭。base fe99fad9964d01315b859494500b60fa63bd05d6；branch feat/TASK-MOD-P2-capability-registry-inpaint，复用原隔离树。证据统一归容器output/p2-inpaint-capability-2026-10-28，辅助比较器output/scripts/p2-inpaint-parity.py。

## 实际实现

capabilities只依赖creation-contracts公开入口及自身；register/unregister/list/resolve/run、schema/版本/依赖环/权限/平台/资源/适配器筛选、明确回退事件及禁止执行后重发均有正反例。image.inpaint绑定原准备好的任务对象，只用TaskPort.submit交回原commit/flush/安全检查/审批运行链；原件/蒙版算法、资产归档、Provider、队列与UI未搬迁。AssetPort/ProviderPort仍由旧Runtime内部承担；P3a全面Port化未完成。

VITE_CAPABILITIES_INPAINT仅字符串true启用，默认关闭；测试注入独立开关。真实ON派发写无用户数据的performance标记。契约包minor1.2.0（新增版本工具与任务引用schema），Desktop/Web源码2.1.48，Mobile应用2.1.43。Mobile file-lock只同步契约版本；根Zod未在此卡升级。

## 命令与证据

| 检查 | 实际结果 |
| --- | --- |
| RED→GREEN | registry-red.log为缺公开注册器的9项RED；host-red.log为缺宿主的3项RED。registry-green.log 9通过；host-green.log含原提交作用域共58通过。Node strip-only参数属性错误与首次TS收窄/Map推断错误已修正，原日志保留 |
| 根快速门禁 | typecheck、lint通过；npm test为2370项，2350 pass/0 fail/20原skip。types-final.log、lint-final.log、unit-final.log、gate-exits.json |
| 契约/Mobile | 包自身ES2022/types=[]配置及Mobile应用/测试类型检查通过；Mobile373 pass/0 fail/0 skip。contract-types-final.log、mobile-types-final.log、mobile-unit-final.log |
| 架构/健康 | R1–R8仍405/11/10/16/0/2/0/0，R5无新增；code-health 0 blocking。显式GOVERNANCE_BASE=fe99仅证明父候选上的增量，不表示main bootstrap已通过 |
| 原浏览器基线 | fe99源码、真实Edge固定1423/retries0/workers1：14 pass/1 fail，run21b04f2f-0319-4282-8bd1-4f5fac723f44；窄屏入口被HUD拦截，browser-baseline.log |
| 默认关闭完整image-edit | fresh production build，14 pass/1同一窄屏fail；run85c41a1c-a10a-4cad-9a13-f16cde5a4677；browser-off.log。没有跳过、force或放宽原断言 |
| 开启完整image-edit | fresh ON build，14 pass/1同一窄屏fail；run095f6d11-edde-4480-95da-75ecd38964ac；browser-on.log |
| 数据/DOM对拍 | native PNG mask和annotated reference两场景：单次审批前0 HTTP、审批后各1 HTTP，performance派发OFF0/ON1。逐字段任务/资产/sha256/parentId/origins/请求multipart文件hash、重载后任务资产及编辑器前后DOM一致；蒙版外每一RGBA仍精确保护。parity-first.log、parity-comparison.json及raw/normalized/normalization清单 |
| 截图零差异 | 严格比较exit1，未标PASS。首次四组中三组各差1像素，RGB118/119，均在录音按钮圆边；无JSX/CSS改动且CSS hash不变。追加每状态连续两张control，ON原生场景同一路径前/后也各1像素变化，证明存在同路径渲染不稳定；same-path-render-control.json、diff/crop PNG。补验ON/OFF各2通过，run5cc8f439-4385-4a1a-b1f8-43cbf2c8559d与d56a911c-d2ce-44dc-ab2c-26562024dbb1，严格比较仍exit1，不靠阈值或挑图宣称零差异 |
| 构建/首屏 | 默认关与开启构建通过，最终恢复默认关。初次现有manualChunks把两份Zod挤入公共块，按契约依赖路径分出延迟capability-validation，未dedupe到旧Zod。main gzip从257.36KB到257.65KB，约+0.29KB，低于max(3%,16KiB)；旧vendor-zod hash相同、CSS hash相同，未首屏preload能力验证器。保留large-chunk警告 |

比较仅归一化实际身份字段中观察到的随机ID、明确时钟字段与DOM中实际blob URL；保持全部字段、关系、schema版本、业务文本、promptHash、asset内容身份和字节hash。不捕获Authorization或真实凭据。performance派发数量单独断言而非忽略其正确性。

最后作者自检补上unregister空版本不误卸全部的反例，并核实provider-api/comfyui两种宿主适配选择。快速三门禁重跑全通过（fast-gates-final.json）；最终ON/OFF fresh build及两个对拍场景分别2 pass，run304bd2e7-3875-4a68-a8ee-313005c83b44与285bfbed-2518-4d95-8ec6-84df67a42ce0。最终任务/资产/HTTP/DOM仍相同，严格PNG四组有一组原生完成状态仍差该1灰阶像素，parity-final.log exit1保留；没有继续重复挑选通过样本。默认关闭dist162文件、主入口index-BieyU0L2.js及全部sha/大小/gzip见bundle-default-final.json。

7轮唯一浏览器证据共78文件已复制至本卡容器browser-runs，逐文件SHA匹配，browser-evidence-sha256.json可复核；原测试结果目录不删除。protection-final.json确认主checkout仍c2a0228a、21个原dirty文件及四份原文hash全部不变；candidate-fingerprint.json保留1103份产品/测试/配置输入hash。最初一次governance:write未设置父候选基线而报bootstrap的2个既有错误，设置正确GOVERNANCE_BASE后0违规；没有扩大或重建基线。

## 未关闭项

严格PNG零差异及原窄屏UI门禁仍未通过，TASK-MOD-P2保持PARTIAL；未做完整verify、独立审查、Tauri重建/重启、真实计费Provider/ComfyUI、Hosted、main整合。功能卡保持PARTIAL。P1-G、Zod严格依赖声明的4处URL限制及四文档其他P/STD/ORG继续各自开放；此卡不表示整套完成。主checkout21个dirty文件和四份原文须在提交前核对hash，实际回执单独外置。
