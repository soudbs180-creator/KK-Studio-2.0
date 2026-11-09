# 验证记录

PARTIAL：本轮有界修复与本地组合验证已完成，跨格式导入、剩余安全来源缺口及外部验收仍未完成。容器 `output/closure-20261109/` 保存基线、日志和独立排查证据。

初始完整 `npm run verify`：lint/typecheck/unit/Agent build+test/UI 通过，format 阶段失败于三份已有候选文件；单元 2761 pass / 20 skip，Agent 205 pass / 2 skip。后续浏览器/设计/像素/插件开发验证尚未因这次运行得到证明。

隔离复现确认恢复目标 Native v1 和未来 v9 被覆盖，两个保护测试失败。修复与完整重验结果后续追加，不改写首次失败。

## 2026-11-09 组合候选本地结果

`verify-02.log` 的 `npm run verify` 退出 0：单元 2771 pass / 20 skip；Agent 205 pass / 2 skip；浏览器 963 pass / 1 skip；设计相关 Node 41/41、浏览器 9/9；插件开发检查 PASS。像素 1 项因没有登记基线而跳过，不是像素 PASS。lint/typecheck/format/UI/tokens 同次通过。

存储额外回归 92/92，包含 Windows 大小写目标路径、Native/未来/未知/坏 JSON 拒写、实际发布中断后的四类原件回滚，以及迁移 origins 保留/非法拒绝。Rust 当前运行 318 pass / 1 ignore。全部使用合成数据，没有写用户原仓库。

源码为主 checkout `cc222004` 加 dirty 候选，不能只用 HEAD 代表本轮代码。容器 `output/closure-20261109/source-combined-candidate.json` 绑定运行输入指纹 `cef77ee45a77d645a8e623bdea272400569236c4bebda0a1470a66e623f37fda`；文档后续补证不当作运行代码变化。

安全锁仅 body-parser 2.3.0→2.4.0 与必要 qs 6.16.0→6.16.1。隔离生产审计 7 包→5 包（1 high/4 moderate），并非安全公告清零。SDK 纯 stdio 服务不在两条已核对 HTTP 拓扑公告范围内，不扩大为所有 SDK 功能安全；插件生产门保持关闭、legacy 宿主权限仍存在。

当前 vendor 指纹清单覆盖 101 个本地源码/说明文件，未把历史参考提交或 KK 引入提交提升为固定上游身份；固定 SHA 与完整补丁映射仍 UNKNOWN。

Hosted 只查到 cc222004 的旧 quality failure，未对未提交候选触发；PR 详情连接中断且本机 gh 未登录，不改远端状态。

## 当前产品快照与桌面证据

通过私有 Git index 创建仅供本地构建的快照 `df597194377d83c5d9dfe0c1204380e84004fe82`，tree `b71d9d22b2e4235f5e8c0e8892ad557f318b797c`，父提交 cc222004。原主 checkout、原暂存和既有未提交内容保留。5004 份文件按字节核对，完整 verify 的运行代码与快照一致；后补文档与桌面验收脚本单独留痕。该快照未推送、未合入 main，不是正式发布。

- `client:installer` 退出 0；新 NSIS 包 357055674 字节，SHA-256 `bcdea4df283ff153a4e3f7171775015c2763a6b45d4f13634a4b01a2081ff955`。现有收据生成器和校验器均通过，绑定上述 commit/tree。EXE SHA-256 `12bf251ae5745f6f95d6a61875c3730ebf2143154b6eeaa7de064b4c1b8fa27f`。
- 官方新鲜度检查 `reason=current`、依赖 `needsInstall=false`；桌面 TaskHost 合成服务验收 11/11，原生与浏览器元数据秘密隔离、未知受理/重启恢复通过，合成凭据清理完成。
- 官方 BAT 启动器最终轮 38 项检查通过、三次启动；独立数据与记忆目录、实际加载 JS/CSS hash、刷新/关闭重开、断开保持、手动重连、服务重启和未知聊天不可接管均通过。测试合成凭据清理完成；不替代真实 Provider、完整启动前模型请求观测或所有系统凭据验收。
- 最终桌面脚本在主工作区按当前 CLI 子页及 Native v3 聊天身份契约修正，SHA-256 `e3a2ac95b8e6ea4c8f59bdd92908cf7ab1217da326e5cd49b9e9e4a08476700b`。以该脚本绝对路径、快照工作目录运行，产品 EXE/资源未变；不宣称该后补测试已包含在 df597194 中。

失败原件保留：启动器第 1 轮因测试环境阻断代理没有豁免 loopback 而 CDP 失败；第 2 轮确认新鲜度后暴露旧 CLI 导航；第 3 轮暴露项目根线程字段已非 v3 权威；第 4 轮暴露同聊天远端 scope 本来允许恢复，不能只删除本地线程关联来模拟未知归属。最终测试按实际聊天权威读取，并用不匹配的聊天身份验证拒绝接管，保留原断言目的；第 5 轮通过。

安装生命周期没有执行：当次检查发现用户已有 2.1.42 安装登记，原测试会拒绝覆盖。原卸载/设置登记、已安装 EXE 与开始菜单快捷方式哈希前后均一致。安装包签名为 `NotSigned`；新安装、原安装升级/卸载、干净系统/WebView2、降级回滚仍 NOT VERIFIED。旧 4990025b、eb7863 安装收据不代填本轮结果。

当前产品快照独立 SHA 审查 PASS（35 文件实际 diff、相邻调用链、25 项定向测试），无新增 P0/P1 或本轮有界修复阻断。独立审查不代替 Hosted、main 集成或五阶段产品验收。

最终桌面脚本补充独立审查 PASS，原 check 顺序/目的及超时保持，断言 46→47；未知归属 fixture 符合当前 scope 契约。原产品 SHA 审查报告不改写，补充记录位于容器 `output/closure-20261109/final-review/launcher-test-final-review.json`。

最后一次 `npm run lint` 与 `npm run format:check` 均退出 0；lint 仍输出 code-health 的 3 项非强制诊断（两个既有 memsearch catch 与 Windows 证据留存 catch），加 2 项明确允许的测试规模提示。原 advisory 执行模式未改变，不据退出 0 宣称全仓健康债务清零。
