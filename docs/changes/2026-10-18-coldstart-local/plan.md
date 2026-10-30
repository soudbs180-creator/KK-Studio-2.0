# Plan：先闭环冷启，再推进本地剩余项

- [x] 规则与现状、旧cold FAIL与严格activation PASS读取；全部9树141dirty/index/refs/raw checkpoint先保全。
- [x] 主仓并发96dirty已另存，旧63逐字节历史校验不再全同；HEAD/index未变，原FAIL和历史副本保留，不回退并发修改。
- [x] root：AgentHost同值thread/messages最小RED→修复→边界/flush失败正例；独审补入真实merge产生undefined的RED并按持久化JSON比较修正。
- [x] 独立实施者：taskRecovery净no-op合成RED→窄修复→真实变化/unknown/多层重试正例；只分配两文件。
- [x] 首次真实Native FAIL后，实际保存2份journals完整复放证实Native→retry旧回执中间往返；另分配nativeTaskHost.ts与新Noop测试，先正式V3 RED后净变化修复，新回执与真实items/canvas变化不得丢。旧源码477/产物/冷启FAIL已保全，需新完整verify/独审/构建及严格cold重验。
- [x] root串行整合，版本Desktop/Web按既有工具递增；本地完整验证与独立双轴源码审查，保全并正常关闭原实例后官方构建。
- [x] 当前产物真实默认库严格冷启（保留完整before/after，所有字段与时间/revision严格比较）；原地激活单独取证，旧FAIL不改写。
- [x] 根据只读优先级审计选择下一项不依赖额度的有界任务，冷启验收闭环后才实施；剩余外部验收保持开放。
- [ ] ledger/当前事实/功能卡同步、精确最终HEAD审查/Delivery、工程外私有归档、日常两个原lnk正常单实例还原。

root独占docs/ledger/版本/Git/1421/1423/Native；Agent文件窄分工。无删除、移动、强停、reset/clean、共享依赖安装或模型发送。

截至d5官方40：以上Native恢复补修、精确全量/双轴及真正严格冷启全部通过；旧条目中的“待新验证”是阶段原文，最终结论见verification最后一节。下一有界任务为Gateway本地上游增量流；最终文档/归档/日常入口按后续收据验收。
