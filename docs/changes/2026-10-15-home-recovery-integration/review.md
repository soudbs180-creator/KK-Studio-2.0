# Review：首页恢复

- Task ID：TASK-CODEX-HOME-20261015；状态：NOT VERIFIED；[Verification](verification.md)。
- 当前仅静态问题定位与测试设计，不能据此关闭三P2。精确源码冻结后独立上下文审查；重点为共享连接等待/旧完成不扰新连接、草稿所有权、新输入保护与真实来源metadata。
- Hosted、正常PR/main及真实客户端和用户产品验收必须分别记录，不继承其他候选PASS。
- dirty预审实际发现HOME-EPOCH-01：usage尾部迟到使用新线程/旧历史；已按独审建议补确定性RED并修复，独审直接回读46项GREEN。App草稿/来源与并发图保护当前未见新增P1/P2。后续职责抽出/最终源码还须精确SHA复审，不将dirty意见冒充最终PASS。
