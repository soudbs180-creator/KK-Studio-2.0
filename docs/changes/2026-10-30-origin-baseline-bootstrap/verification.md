# 实际验证

Task: TASK-MOD-GATE-BOOTSTRAP；current；初始状态 IN_PROGRESS。cwd D:/kk-studio/.worktrees/TASK-MOD-P0-architecture-baseline，branch refactor/TASK-MOD-P0-architecture-baseline，base 4610c3339db436147006171aec08aad4cfdfb679，head/tree 待提交后固定。Node24.20.0/Windows。

尚未生成基线或执行本候选门禁。物理H3与ORG6证据属于保留的P3候选 f074d4de，不计本候选业务验收。外部日志位于 output/main-physical-org6-2026-10-30/bootstrap/。

基线生成实测：R1=376/R2=10/R3=6/R4=14/R5=0/R6=2/R7=0/R8=0，布局640，均指向origin4610c333；与P3已减至0的状态分开。首次台账元数据枚举错误修正后governance-v2退出0。类型0、默认lint0（未覆盖GOVERNANCE_BASE，实际选择origin，与本机main分叉不混用）。首轮根单测1974pass/20skip/1fail，唯一失败是docIndex完整快照fixture的2026-10-12日期受真实时钟影响；复用P3已有修复，仅显式传同日now，保留过期拒绝用例，不改产品/校验器。相关docIndex/架构/布局测试补跑见targeted-green.log。完整verify继续执行。

当前自检：默认lint/typecheck均0；完整verify已重新通过根1975pass/20skip/0fail、Agent204pass/2skip/0fail、UI规范与格式，838项浏览器正在执行，尚无最终verify退出码。source-preservation.json证明src/src-tauri/packages/mobile/public/vendor及三端版本未变；7份工具/规则/测试与P3已审原件逐字节（统一LF）一致，清单含Git blob和SHA。未关闭完整verify/Hosted/审查/合流。
