# 实际验证

Task: TASK-MOD-GATE-BOOTSTRAP；current；初始状态 IN_PROGRESS（历史记录；当前结果见末节）。cwd D:/kk-studio/.worktrees/TASK-MOD-P0-architecture-baseline，branch refactor/TASK-MOD-P0-architecture-baseline，base 4610c3339db436147006171aec08aad4cfdfb679，head/tree 待提交后固定。Node24.20.0/Windows。

初始时尚未生成基线或执行本候选门禁；保留该时间点记录。物理H3与ORG6证据属于保留的P3候选 f074d4de，不计本候选业务验收。外部日志位于 output/main-physical-org6-2026-10-30/bootstrap/。

基线生成实测：R1=376/R2=10/R3=6/R4=14/R5=0/R6=2/R7=0/R8=0，布局640，均指向origin4610c333；与P3已减至0的状态分开。首次台账元数据枚举错误修正后governance-v2退出0。类型0、默认lint0（未覆盖GOVERNANCE_BASE，实际选择origin，与本机main分叉不混用）。首轮根单测1974pass/20skip/1fail，唯一失败是docIndex完整快照fixture的2026-10-12日期受真实时钟影响；复用P3已有修复，仅显式传同日now，保留过期拒绝用例，不改产品/校验器。相关docIndex/架构/布局测试补跑见targeted-green.log。完整verify继续执行。

当前自检：默认lint/typecheck均0；完整verify已重新通过根1975pass/20skip/0fail、Agent204pass/2skip/0fail、UI规范与格式，838项浏览器正在执行，尚无最终verify退出码。source-preservation.json证明src/src-tauri/packages/mobile/public/vendor及三端版本未变；7份工具/规则/测试与P3已审原件逐字节（统一LF）一致，清单含Git blob和SHA。未关闭完整verify/Hosted/审查/合流。

## 完整本地 verify 结果

2026-10-30，verify.exit=0。默认 lint/typecheck/版本/治理/Markdown/格式/UI规范通过；根1975 pass/20 skip/0 fail，Agent204 pass/2 skip/0 fail；Edge生产1423浏览器838 pass/0 skip/0 flaky/0 unexpected，12 workers，约2.8分钟；设计8/8，开发1421四插件四步骤PASS。完整日志verify.log原样保留。

身份口径：verify开始时为origin4610c333上的dirty治理候选；浏览器JSON metadata.sourceHead确为4610c333，运行中仅提交已验的同源治理文件为75775f3c，未改业务源/版本，开发插件末段回执sourceHead为75775f3c。不能把浏览器元数据改写成75775f3c；产品源码树与base完全相同、7份复用工具/测试与P3已审原件相同的证明见source-preservation.json。最终托管CI仍需对提交后的当前SHA执行，不由这个本地dirty运行记录替代。

474份浏览器/设计/开发回执及附件已复制到工程外bootstrap/verification-artifacts，全数重算SHA/大小一致，共148612922B；verification-artifact-receipt.json记录相对路径、原元数据和哈希。没有覆盖/删除原失败证据、重写报告sourceHead或隐藏skip/flaky。旧ref保全见bootstrap-ref-preservation.json（位于本轮topic父目录）。

本候选仍PARTIAL：正式独立评审、Delivery/当前SHA Hosted、正常PR squash及回到P3整批冲突/验收未完成；本机main/21审计原件未改。这个前置不把P3/P6/ORG6合流或全项目验收标为完成。
