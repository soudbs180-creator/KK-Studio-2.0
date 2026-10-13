# 独立审查记录

任务：TASK-CHERRY-RED-001。已完成独立dirty预检及下列两段不可变源码审查；源码审查与Hosted/安装验收分别判定。

最终审查须绑定本任务实际 base/head 或工作区快照，覆盖新增协议与免密边界、Markdown、助手/比较身份和原生生命周期。实现者自检不替代独立审查。

## 独立预检

审查者为fresh-context `cherry_independent_review`，只读、无写入/真实API；2026-10-13 08:18:55 UTC，base/head为51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c。dirtyDiffHash：82a1e928be843c1028aa5330e6d0d795dbe950dc68a3a915e01c9f399c276db9。算法为 tracked binary diff + `UNTRACKED` + sorted path/content SHA256。

独立14个定向unit文件136/136 PASS，并复验实际恢复函数。此前发生容量错误的未完成回合未当PASS；后续完成回合对上述快照给出“未发现仍开放P1/P2”。

- P1比较B自动改变画布原账号A：两处共用原绑定，完整endpoint/ref/model与原ID保持；移除原连接拒绝替换。
- P2比较恢复误标原节点/误接结果边：Web与Native恢复跳无source的比较任务，独立函数/Mock IPC复验关闭。
- P2离线本机接口：明确放行严格loopback，远程仍拒绝。
- P2guardian输出EPIPE：启动owned-group cleanup并持lease到groupgone，Unix实际运行待Hosted。
- P2空ref免密/大小写：Native只允许显式loopback text none，容量身份按endpoint；ASCII大小写统一，不扩大主机范围。
- P2超长助手/内置覆写：三入口数据保护与3000字符上限，普通Skill不扩大只读限制。
- P2flush取消：只启动仍queued的任务，executor拒绝其它终态；完整App延迟flush浏览器仍待运行。

该快照后版本/文档/网站入口与运行fixture变化，最终提交复核不得直接沿用此快照为全树PASS。

## 不可变源码审查

1. `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c → 015f19341f4c8e918290e985a96d927db0da4aad`：独立只读审查PASS，开放P0/P1/P2均0。复查实际账号/取消/恢复/免密/旧fingerprint及助手保护；网站入口保持固定HTTPS和既有shell能力。后续该审查者参与了目录锁测试与Linux导入修复，因此后续增量另交fresh reviewer，不自审其实现。
2. fresh-context `cherry_final_review`，`015f19341f4c8e918290e985a96d927db0da4aad → 81cfd11fe79279df2379e402ddefa00a908099a8`：规范轴0 finding、需求轴0 finding；未发现仍open的源码P0/P1/P2。其子审查并行只读，未改业务源码、测试、收据或文档。

第二轮独立执行51/51 Node定向测试、tsc、UI门禁（232文件0违规）、Native fixture语法与diff检查均PASS。亲读21项浏览器与3项header实际输出，独立核对Native13回执、当前EXE及12个源码hash一致；没有重复执行GUI，不将作者运行结果标为审查者实跑。完整1105的正确原始输出为[unit-1105.log](evidence/unit-1105.log)，此前失败的unit-final.log未冒充最新证据。

源码审查PASS；合并/交付仍NOT VERIFIED。exact81c Hosted quality因仓库外容器快照缺失FAIL，后续步骤未执行；最终三平台build抽查时运行中。macOS/Linux GUI、安装/签名、真实Provider/系统vault及用户验收不计PASS。后续证据仅追加到[验证记录](verification.md)；文档工件提交不改上述审查源码边界。

审查后作者收到exact81c三平台matrix均SUCCESS，真实job和日志保存在验证页。浏览器panel-resize旧两按钮间距断言更新为三按钮的逐个相邻间距（保留40px上限）与不重叠检查，随后6项PASS；仅测试/证据变化，产品源码未变。
