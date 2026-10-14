# 全页面新UI收敛实施计划

**Goal:** 将现有可达页面与卡片统一到当前UI，验证历史恢复并通过PR合主线。
**Architecture:** 复用tokens、共享输入框/模型菜单及卡片renderer，修既有owner；数据继续走原codec与存储身份。
**Tech Stack:** React18/TypeScript、Vite、Tauri2、Node24、真实Edge Playwright。
**Spec:** [spec.md](spec.md)。任务由root按顺序执行，三个独立只读审计并行；遵循项目SDLC与验证约束。

- [x] 核实规则、最新6bc2e3da、实际fetch主线和干净隔离树；基础build通过。
- [x] 清点实际可达页面/卡片/模型caller，建立[覆盖矩阵](coverage.md)，保存CSS/DOM与历史主线保全审计。
- [x] 依用户追加纠正逐类型建立空/有内容/运行/失败/恢复互斥矩阵，复证空态toolbar=0、有内容唯一toolbar及真实动作链；保留旧79/新checkpoint50的原范围，新状态按verify-3/Native56独立验收。
- [x] 已只读核对Skill/MCP/伙伴与模型接入分类；任务重试4条真实RED后统一全部caller可用性，34保护unit通过，HUD/详情/矩阵实际Browser断言与完整verify-3通过；分类状态按fixture范围记录，不代填外部连接。
- [x] 为确定问题增加用户行为与恢复RED；最小修复共享CSS、菜单caller、输入布局及真实恢复缺陷；单一写入者。
- [x] 已取得79条定向生产浏览器GREEN、三宽全部设置3条PASS；普通菜单最终2条GREEN及完整verify-3已通过。各轮失败/误设均保留。
- [x] 审计主线squash差量并本地承接固定main694：checkpoint0f506ae1→merge1653966f；104冲突/25自动差量逐项核验、21历史blob保全，Delivery704/0；这不是远端main落地。
- [x] Desktop/Web受影响版本递增，完整verify-3、Delivery704/0与新Desktop56项资源身份验收、source/integration241精确审查已PASS；最终文档/test-only head另补审。
- [ ] 推送task分支并建PR，回读精确head托管必需检查、审查与线程；通过后普通合并。
- [ ] fetch复核merge SHA/main实际树与post-merge检查，收尾账本/恢复入口；不更改primary并发文件或清理历史分支。

风险重点：Google/重绘模型能力和配置身份、长型号/variant、浮动菜单、旧项目文字/媒体恢复、squash后主线治理保全、真实运行资源新鲜度。


当前执行位置：source `241f3050124ad7773ced0b47a55629373177205e`。165完整verify在Browser740/745、5失败处退出，source/integration review三P2均CHANGES_REQUIRED；241修复后的14条定向GREEN已回读。当前等待完整verify-2、新Desktop/Native及241或后续最终head独立复审，之后才做Hosted/PR/main；以上未勾选的最终验收不由中间GREEN补齐。


阶段补充：241官方隔离Desktop2.1.27 Native56checks/0errors、dist资源字节与release身份、owned正常关闭均PASS，source241/integration241精确复审PASS关闭三P2。完整verify-2/最终文档head及Hosted/PR/main仍未完成，相关整体步骤保持未勾选。


最终本地阶段已完成：verify-3 exit0 / Browser747首试全PASS / development PASS；Native56、Rust163及source/integration241审查PASS。verify-2音频全局selector夹具失败和修正后的实际播放2PASS保留；当前REVIEW/整体NOT_VERIFIED。最终doc/test-only提交head尚待root形成，远端两个步骤保持未勾选。
