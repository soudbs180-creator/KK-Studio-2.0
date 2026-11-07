# P2能力注册表与局部重绘试点

TASK-MOD-P2，owner root，base fe99fad9964d01315b859494500b60fa63bd05d6，复用隔离树，branch feat/TASK-MOD-P2-capability-registry-inpaint。用户明确启动P2，P0/ORG/P1审查和主线尚未整合，保持堆叠候选边界，不把前置状态改成已完成。

建立仅依赖契约包的薄注册/解析/分发切片，首个image.inpaint沿用原算法/资产/队列/审批/保存。capabilities.inpaint默认关闭，映射构建变量VITE_CAPABILITIES_INPAINT，仅值true启用；不用持久化用户设置或新存储key。禁止在同一次用户操作中双跑Provider，双路径对拍只用隔离测试夹具。
