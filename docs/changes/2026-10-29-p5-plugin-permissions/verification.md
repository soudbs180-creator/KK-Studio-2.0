# TASK-MOD-P5 验证

PARTIAL；P5部分完成：契约包1.4.0新增清单/JSON Schema/RPC与PermissionPort；包目录、版本/平台、逐文件SHA、权限交集、身份、消息上限/超时/重放/撤销和更新失败保护已接线。真实Edge实验T1与安装器→React→当前Context链通过；生产新包执行门默认关闭，legacy保持宿主兼容。Desktop IPC、WebRTC/其他逃逸面、独立安全审查、授权Figma/UI、T0/T2/T3与其他贡献未完成，不能称为生产插件沙箱。

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

P5专用8项单元覆盖非法清单/秘密/路径/主机版本/完整性、授权交集、身份/停用、RPC未知方法/重放/大小/超时/提交前关闭、默认不执行、重复ID/更新身份/持久化失败与保留原记录。旧插件Loader/恢复/启动竞态42项限定回归通过。新边界的Zod定义在契约包内，复用该包4.6.7，不把根Zod安全候选说成已合流。

实验Web T1浏览器两项通过：DOM/存储/HTTP/脚本/Worker/导航/身份保护与RPC权限；真实loader验包→挂载→Context更新不重启guest→停用。该harness直接编译本次runtime源码，和App生产默认关闭新包是两个明确事实；不声称生产隔离或跨平台验收。

最终补验：ON run ce94fccb-431a-43a0-81c2-81a72fe70cf4 为5/5，OFF run 085777bb-4dee-4cf1-bcdb-4e6b7f961bb0 为9/9，Agent另3/3重复通过。本机服务实际Edge生产smoke通过。与P3的归一化任务/资产/HTTP/DOM也一致。严格PNG仍失败：native-before在(1182,988)有1个像素/1灰阶差异，其余3张相同；本次OFF同路径4/4通过且重复PNG相同，没有在本次同路径重复中复现该差异。保留历史相同位置波动证据，不把严格零差异记为PASS。包体按同一gzip量测为257762→272631字节，+14869，预算16384字节内；构建日志Vite报告约274.92KB。原始图、源码/构建/归档SHA与完整限制见容器output/p4-p5-2026-10-29/final-receipt.json。

JSON Schema按input模式导出，省略permissions与Zod默认无权限一致；相应结构漂移与旧版本适配反例保留。所有T1结论仅限显式opt-in的Web fixture，生产门没有开启。
