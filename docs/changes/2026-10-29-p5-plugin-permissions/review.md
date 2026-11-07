# TASK-MOD-P5 作者安全预检

base `cf73c8425b359035e99da5f8a5db5b0db7697080`；独审NOT_VERIFIED。主体绑定宿主对象与生命周期，不取自消息；每次装载重新校验manifest/files，权限是声明与明确授权的交集。JSON路径/身份、大小/超时、跨frame来源与token、重复和迟到提交均受控。更新失败保留原记录/已加载插件，卸载不删除用户项目资产。源码scheme/hash在本次fixture内验证，代码导入器未接收新包源码。

剩余release-blocker：Desktop原生IPC边界、WebRTC等更广逃逸面和资源耗尽、跨浏览器、独立安全审查、授权/撤销Figma界面；生产门默认关闭。T0/T2/T3、其他贡献、受信目录完整性和SDK/脚手架继续与OPT-401同一设计，不宣称全部实现。见[ADR-031](../../architecture/adr/ADR-031-plugin-permissions-and-sandbox.md)。
