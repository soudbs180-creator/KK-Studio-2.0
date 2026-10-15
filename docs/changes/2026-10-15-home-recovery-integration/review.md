# Review：首页恢复

- Task ID：TASK-CODEX-HOME-20261015；状态：NOT VERIFIED；[Verification](verification.md)。
- 领取时仅静态问题定位与测试设计，不能据此关闭三P2。精确源码冻结后独立上下文审查；重点为共享连接等待/旧完成不扰新连接、草稿所有权、新输入保护与真实来源metadata。
- Hosted、正常PR/main及真实客户端和用户产品验收必须分别记录，不继承其他候选PASS。
- dirty预审实际发现HOME-EPOCH-01：usage尾部迟到使用新线程/旧历史；已按独审建议补确定性RED并修复，独审直接回读46项GREEN。App草稿/来源与并发图保护当前未见新增P1/P2。后续职责抽出/最终源码还须精确SHA复审，不将dirty意见冒充最终PASS。

- 精确fc76已获PASS_SOURCE_SCOPE和PASS_LOCAL_VERIFY_SCOPE；source/运行各自绑定同一head，完整785浏览器及旧/新产物哈希均由独审回读。c180为actual main492上的单独cherry，完整tree与fc76相同；当前纯文档承接后还需差量审查。Native/代理模式/新环境后验证及正常HOME PR/main仍待。

- HOME-NATIVE-01/P1：f10实际重开FAIL，两个只读审查均确认stdout诊断占用32行握手预算。root先真实stdio RED，再按入口边界最小修复；3项GREEN尚不能关闭原生阻断。新冻结源码/实际重开和完整门禁须独审。

- a85精确差量已获PASS_SOURCE_DELTA_SCOPE；本轮完整verify与6198输出hash经独审PASS_OUTPUT_RETENTION_SCOPE。原Native脚本38/38和官方新产物实际通过，独审PASS_LOCAL_NATIVE_STARTUP_RECOVERY_SCOPE绑定a85、原Native脚本hash相同，HOME-NATIVE-01关闭；本机通过不代填Hosted/main、真实Provider、日常资料和用户验收。
