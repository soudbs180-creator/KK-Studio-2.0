# Review

- Task ID: `TASK-UI-CONSOLIDATE-20261014`
- self-review：源/版本/功能候选盘点已完成；生成证据与源码恢复分开，原工作区保持。
- independent review：NOT VERIFIED，待候选实际提交后绑定base/head复核。
- 当前本机冻结版不是全部候选集成或正式发布；标签/喜欢位置、固定面板、输入描边、绿色和协议目录尚待实现。上传形状已有CSS根因；视频位置尚未运行复现，不预填修复。
- 最新 main 质量门禁、Hosted、用户产品验收和正式发布分别核验，不用本地构建替代。
- 首轮完整浏览器515个spec含1flaky（native key identity持久化超时）；原JSON/log保留，根因UNKNOWN。冻结版只作为恢复/开发基线，不能据command exit0说零回归或稳定发布。
- 定向5次zero retry通过，未代替完整套的首试失败。开发字体403已在694e3d18最小修复并重新取证PASS，fs父目录仍拒绝。独立最终复核结果保存于本机输出的independent-baseline-review.md；未收到结果前仍NOT VERIFIED。

## 后续 UI 候选的审查边界

前述“尚待实现”描述冻结阶段；后续源码现已接入控件、面板、标签/收藏兼容、预设目录、设置分组与使用记录，但源码存在不能关闭最终验收。冻结阶段独立审查只覆盖恢复/捕获与当时配置，不批准新 UI 或全部分支的产品集成。

本轮规则按用户设计/澄清优先处理历史冲突，业务门禁、秘密隔离和旧数据保留不放松。新增标签的领域/codec/原生快照/项目包需一致；移动窗口上的屏幕面板、长文案、弱焦点与可操作命中需浏览器/实际宿主证据。

完整首试、已有 flaky 根因、未适配协议、真实消耗缺失、Native Mobile 未实现、安装包与 Hosted 未验证、体积预算未量测均继续列为明确限制。最终独立审查绑定新 base/head，由根接收回执；不预填 PASS。

上述为阶段边界。2.1.18当前组合的完整verify与532首试browser现已通过、flaky0，gzip预算实测通过；不能据此改写2.1.17历史flaky根因。最终Desktop/提交审查与发布范围按[验证记录](verification.md)和工程外当前回执继续核对。自审已覆盖标签/收藏的TS与Rust兼容、坏快照保护、CLI矛盾登录证据、手动缩放保持、固定屏幕面板层级与跨项目草稿隔离；未启用不支持的协议或真实费用推算。

2.1.21承接最新日常2.1.20后，新独立上下文预检复核CLI/凭据/画布同步/Agent执行/保存状态/收藏兼容；41纯单测通过，发现SEARCH-001 P2，已先复现后修正项目类型筛选与标签适用范围。组合首轮插件精确原件失败已修正缺省tags字段，未删除或放宽恢复断言。此前USAGE-001/002与本轮SEARCH-001均需最终提交绑定复验；dirty预检不是正式review。历史源和Native证据只保留原范围，完整当前结果由工程外最终receipt保存。

## 最终产品源码复审

0e5087e6全组合独立review CLEAR（41纯单测）；真实Native随后发现工具栏100覆盖面板21/22，旧CLEAR原范围保留，未覆盖实际FAIL。共享层级修复提交7a463742的独立delta review CLEAR，token顺序100<101/102<200/300/400、top-layer与TagEditor边界和RED/GREEN普通命中检查通过。根完整verify545首试/0flaky与真实新EXE9项PASS补齐本地运行边界；原错误driver精度、旧真实Native FAIL、各轮失败与flaky原件保留。最终docs-only HEAD另行独立核对，不改写上述code SHA，也不声称Hosted、安装器、真实Provider或用户视觉已通过。
