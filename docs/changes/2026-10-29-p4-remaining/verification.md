# TASK-MOD-P4-REMAINING 验证

PARTIAL；本目标原有82条R1边已清零。P4源码收敛完成：367条唯一深层依赖边降0，285条属于指定五切片、其余82条亦清零；381条导入/再导出语句按顺序改写。R3由10降0，R4保持0，其余基线不新增。25个迁移纯函数AST一致，五份既有UI结构一致，最终CSS与P3完全同字节。根最终2363通过/0失败/20跳过（P4单独阶段2355通过），Mobile373与Agent204通过。限定浏览器、体积及退出码见最终回执；独审/原生/完整verify/main尚未完成，保持PARTIAL。

比较基线 `cf73c8425b359035e99da5f8a5db5b0db7697080`；复用 `refactor/TASK-MOD-P3-feature-cycles` 和既有工作树。原始日志、独立run、包体/图/源码SHA与最终退出码在容器 `output/p4-p5-2026-10-29/`，不能把检查点metadata SHA当成干净构建；实际dirty源码由最终fingerprint绑定。

| 检查 | 当前证据 |
| --- | --- |
| 架构 | R1=0、R2=11、R3=0、R4=0、R5=0、R6=2、R7=0、R8=0；新R1回归与原R4回归都保留，baseline只减不增 |
| 根测试 | `tests-closure.log`，2383 total / 2363 pass / 0 fail / 20 skip；未增加skip、未删业务断言 |
| 类型 | `types-final.log`及最终复核；根/契约/Mobile通过，P1严格ES2022依赖声明缺口仍另列 |
| Mobile / Agent / 本机服务 | Mobile373 pass；Agent204 pass / 2 skip；HTTP重启/主备恢复通过，原生和真实Provider不由fixture替代 |
| 生产浏览器 | P4生产基线4/4后，含legacy插件、新沙箱source fixture、inpaint和Agent的限定组9/9；最终ON/OFF与重复Agent结果以最终回执为准，固定1423、真实Edge、1worker、0retry |
| 源码搬迁/视觉 | `move-proof.json`的25个纯函数相同、5份旧UI结构不变；CSS hash b72901cddd761d723d3d8cc77293535f6888328e502e70906a010f742ec7d43f；P5没有启用新的宿主授权UI |
| 快速治理、格式、UI门禁、预算 | 最终日志记录退出码与限制；首次P5主包277.50KB超过预算，实验执行器改成门后lazy import，降至约274.91KB，对比P3约260.75KB；仍保留大chunk警告 |

保留中间失败：导入脚本遇side-effect/re-export未支持时未写源码；两次VM夹具未适配、Node缺TSX/无后缀解析、Agent过早取单例、R3目录层级违规、CSS加载顺序均有失败与修复记录。一次Agent来源连线保存失败未归因为P4，后续同版反复验收另记，不能改旧日志为通过。沙箱fixture的Worker错误为异步事件、被阻止导航产生Edge错误页，测试改为验证实际安全事件和主窗口仍可用，未放宽策略。

当前完整verify未完成；P3原9项浏览器失败仍开放，未据此改产品UI。独立审查NOT_VERIFIED（用户不使用子代理），Tauri/真实Provider/Hosted/main未验；四份需求的其他P、STD和ORG任务仍开放。所有阶段保持PARTIAL，不能以R1=0或source fixture证明全部交付。

最终补验：ON run ce94fccb-431a-43a0-81c2-81a72fe70cf4 为5/5，OFF run 085777bb-4dee-4cf1-bcdb-4e6b7f961bb0 为9/9，Agent另3/3重复通过。本机服务实际Edge生产smoke通过。与P3的归一化任务/资产/HTTP/DOM也一致。严格PNG仍失败：native-before在(1182,988)有1个像素/1灰阶差异，其余3张相同；本次OFF同路径4/4通过且重复PNG相同，没有在本次同路径重复中复现该差异。保留历史相同位置波动证据，不把严格零差异记为PASS。包体按同一gzip量测为257762→272631字节，+14869，预算16384字节内；构建日志Vite报告约274.92KB。原始图、源码/构建/归档SHA与完整限制见容器output/p4-p5-2026-10-29/final-receipt.json。
