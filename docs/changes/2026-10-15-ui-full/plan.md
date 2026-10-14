# 全页面新UI收敛实施计划

**Goal:** 将现有可达页面与卡片统一到当前UI，验证历史恢复并通过PR合主线。
**Architecture:** 复用tokens、共享输入框/模型菜单及卡片renderer，修既有owner；数据继续走原codec与存储身份。
**Tech Stack:** React18/TypeScript、Vite、Tauri2、Node24、真实Edge Playwright。
**Spec:** [spec.md](spec.md)。任务由root按顺序执行，三个独立只读审计并行；遵循项目SDLC与验证约束。

- [x] 核实规则、最新6bc2e3da、实际fetch主线和干净隔离树；基础build通过。
- [x] 清点实际可达页面/卡片/模型caller，建立[覆盖矩阵](coverage.md)，保存CSS/DOM与历史主线保全审计。
- [ ] 依用户追加纠正逐类型建立空/有内容/运行/失败/恢复互斥矩阵，复证空态toolbar=0、有内容唯一toolbar及真实动作链；保留旧79/新checkpoint50的原范围，不作该验收PASS。
- [ ] 已只读核对Skill/MCP/伙伴与模型接入分类；任务重试4条真实RED后统一全部caller可用性，34保护unit通过，扩HUD/详情/矩阵实际Browser断言后等待新build GREEN；连接/分类完整状态仍待组合验证。
- [ ] 为确定问题增加用户行为与恢复RED；最小修复共享CSS、菜单caller、输入布局及真实恢复缺陷；单一写入者。
- [ ] 已取得79条定向生产浏览器GREEN、三宽全部设置3条PASS；普通菜单最终2条GREEN已通过，待执行完整回归。各轮失败/误设均保留。
- [ ] 审计主线squash差量，逐项保全治理/功能/源码后集成；冲突修复后重验。
- [ ] Desktop/Web受影响版本递增，完整verify/Delivery与新Desktop资源身份验收；精确源SHA独立审查。
- [ ] 推送task分支并建PR，回读精确head托管必需检查、审查与线程；通过后普通合并。
- [ ] fetch复核merge SHA/main实际树与post-merge检查，收尾账本/恢复入口；不更改primary并发文件或清理历史分支。

风险重点：Google/重绘模型能力和配置身份、长型号/variant、浮动菜单、旧项目文字/媒体恢复、squash后主线治理保全、真实运行资源新鲜度。
