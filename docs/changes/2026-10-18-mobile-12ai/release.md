# Release：Web2.1.39 / Mobile2.1.4

- Task：TASK-MOBILE-12AI-001；产品PR70；记录状态：RELEASED（Web发布通过，真实图文验收NOT VERIFIED，任务IN_PROGRESS）。
- 正式来源main `9d10af39d0b028a8ddc7f06c594c813ef25b7205` / tree `611cf648ade1d0fb98c5474ae91615f0bbaf1a23`；tag `v2.1.39`；Desktop源码仍2.1.37，无新桌面或Native包交付。
- 用户授权：本轮intent记录已授权修复、正式发布与单张图片/短文本复验；后续明确不额外消耗视频额度。发布授权不等于用户已接受本轮图文结果。
- 关联：[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。工程外证据根为 `D:/kk-studio/.analysis/kkai-12ai-mobile-fix-20261018`。

## 来源与质量

c813产品source独审、b0ef七文件/UI补审及9d10完整同tree晋升均已冻结；原报告不改写。main quality [39104785098](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39104785098) attempt1五项、guards [39104785090](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39104785090) attempt1双平台均success，`main-gate-receipt.json` SHA256 `6c1985446dada63054b8c74dd4febeefb5cb45077961f2fb3dba4860a0725d9d`。

## 正式发布实录

| UTC时间/动作 | 实际结果与来源 |
| --- | --- |
| 正常tag/push `v2.1.39` →9d10 | 发布助手只读预检ready后单次创建正式Release；`release-published.json` SHA256 `9041be84ea87a05b386484ecb1f30590cb96e13585916028f3438bf434b28b8b`。 |
| 07:19:51Z Release发布 | [Release416299447](https://github.com/soudbs180-creator/KK-Studio-2.0/releases/tag/v2.1.39)，draft=false/prerelease=false，notes SHA `55d59a03c485f8a0d6b8f11bd8a87641f9dc7c5a63c63eea0d6e65fd3d551bdc`。 |
| 07:19:52Z release-event workflow | [managed-web-release39107253299](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39107253299) attempt1、deploy117615692266全部success，07:21:09Z日志activated v2.1.39。receipt SHA `34031cc45b56e7b7b222eed99b1d42410ed55155ac6d59653ade633ea8d7ddc5`。 |
| 07:24Z公网回读 | `production-after.json`：build-info / Mobile HTML /实际entry均HTTP200/gzip/no-cache，source9d10/Web2.1.39；首次大文件identity读取超时保留，后续gzip读取成功。 |
| 07:25Z生产入口 | `production-mobile-web-receipt.json`：origin=https://kkai.plus，source9d10，9项通过、0失败/skip/flaky；不调用Provider。用户浏览器也显示Mobile2.1.4，不能以此代填本轮真实生成。 |

CI archive SHA `792ac477958c42f71c58457e53aa060ca59fa475721f402c0797e800edb1bafd`与服务器marker相同；current manifest SHA `9ca0fcbd5f89ad185f9810b5d63082306419c6f69f2ce699653a474685f22c71`。公网Mobile入口 `entry-140201476199fedafe0abc0ba5b1dfb9.js` 为1,638,695 bytes，SHA `cf341da42fd899433c99a4de1089097dbe74d18fa6b2099a9acc2fbb957d9d36`；CI导出日志 `web-release-mobile-bundle-log.json` 与该名称对应。它与Windows本地3d5/c0c5产物不同，不冒充同bundle。

tag push另触发旧Windows installer39107203456，在v2.1.39不等于Desktop2.1.37的版本门禁失败；见 `legacy-tag-run-boundary.json`。该失败与之后成功的正式Web发布分开保留，未修改Desktop版本或重跑旧installer。

## 回滚与保护

发布前current38/previous37，发布后current39/previous38、直属受管目录精确两份，两版完整manifest验证报告均true；previous38仍为原f730/179文件/23Mobile、manifest `8ba352804364b3bf2130bb6cb6dc0cfbc371131327327832c7387fae8c0b8a1b`。保留唯一回滚38、控制器既有健康失败回滚路径；未执行实际生产降版。库存来自root原截图和独立人工字段转录，非reviewer直接stdout/重新读取服务器全部字节。before/after review收据保留证据方法和限制。

nginx/原配置备份/auth SHA、旧临时授权tag0及API/Nginx/PostgreSQL的active/running与PID693/666/673前后观察一致；不声称持续uptime或业务数据库每字节不变。没有新增SSH授权。

canonical不能称为完全未变：初始clean109c/indexe01ff8e9，终核本地main0a49/index7dc72867和4条dirty；两次只读head/index/diff/文件hash稳定，reflog仅说明操作与时间，不能据此归因操作者。改动未回滚、覆盖、暂存或纳入隔离发布；旧release树0cb/indexab7757bb仍clean且与前基线一致。详见verification的保护终核及 `protection-after.json`（checksPassed=false）/`protection-concurrent-local-state.json`。

## 仍待验收与文档收尾

本轮真实单图和短文本尚未执行：reload清除原浏览器内存Key，已在原连接编辑页请用户填Key且自行保存，尚未收到回复。下一步只按授权各一次生成、自动保存/普通导出与刷新同ID/hash核对，保留旧项目及unknown失败任务；此前文本成功不是本轮新版本验收。

视频仅本地模拟回执/样本的自动保存、播放、导出、刷新PASS，0真实上游视频调用/额度消耗；真实模型生成、计费、Safari、真机、新原生包等未验。FEAT-028仍PARTIAL、T12开放、TASK-MOBILE-12AI-001保持IN_PROGRESS/NOT_VERIFIED。

本文件由收据实施者整理，未将其自检当独立review。本分支最终文档head仍须另一上下文独审及相应Hosted/Delivery；链接到ledger、PROJECT_STATE、PROGRESS与Handoff的事实保持同一范围。
