# P8 验证（源码候选）

TASK-MOD-P8；base792759611c60f698366b755f94198071c6c65c27；复用既有工作树/分支。Desktop/Web2.1.53，Mobile2.1.43，契约1.5.0。尚未合main，未更新安装客户端/发布。

## 实现与不变项

七组现有装配责任迁入src/app：Skills、首页模型、Agent订阅、会话投影、任务协调、Agent/插件桥、主题/快捷键。App从2002行降至1546行（按splitlines计）。35个原函数体AST一致，Agent桥12条语句/闭包和两项设置effect及依赖一致；主返回JSX完全一致，28个CSS入口顺序不变。App保留必要的原模块求值顺序，不让自动整理import改变CSS副作用先后；构建CSS恢复index-0k4mv2N2.css原内容hash。代码/函数不是第二套任务或Provider实现。

旧conversationSubmitScope回归改从实际App/私有hook源码读取原函数，48项原业务断言全留，先见缺模块RED后48/48 GREEN。没有把源码路径变化当成业务回归删断言。

## 浏览器同态

工程外证据D:/kk-studio/output/p8-integration-2026-10-29。7927原App与候选App在相同2.1.53版本、相同项目ID/主备快照输入下分别构建；期间只临时替换本任务自己的App文件，finally恢复并核对。主仓从未参与构建或编辑。

1920×844、390×844各取工作台/设置，共4组DOM原始SHA完全一致；四张PNG逐字节相同、0差异像素。真实Edge1423生产预览、worker1/retry0，沿原headless Shell防线，仅本测试额外使用disable-gpu软件渲染，并要求连续两次PNG完全一致才取样；没有遮罩或增加像素容差。原硬件渲染下窄屏设置存在53像素差异，原始browser报告仍保留；软件对拍不能替代真实GPU/桌面客户端验收。来源/比较见parity-stable-comparison.json、move-proof.json和software-differential-*。

## 合流前已知缺口

P8改动前已复现codex-home-routing四失败，改动后同四位置失败；属于原完整verify缺口，单元2378通过不是全套门禁已绿的证据。后续测试前置/能力菜单核验作为门禁修复单列，不回退现行界面。真实GPU、独立review、完整verify、main/远端CI仍待完成。

主仓21份dirty文件已逐字节复制并核SHA，保留原patch、索引对象清单；与分支重叠4路径为docs/README.md、governance两账本文件和package.json。主仓保全与fetch结果见primary-preservation/及merge-preflight.json。origin/main与本地main仍分叉，不能把本地快进条件称为远端已合并。

当前检查与最终head/hash以工程外最终回执为准；P0–P7/STD/ORG原开放项、P6.1参数面板/Figma实例/真实GPU不自动关闭。
