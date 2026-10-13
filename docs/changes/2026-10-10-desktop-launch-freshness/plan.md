# Plan

1. 为锁文件与 node_modules 漂移检测先写失败单元测试。
2. 在唯一 freshness 构建入口加入受控 `npm ci` 自修复与复检。
3. 补充启动规则，明确源码、依赖、release 和运行进程四者必须闭环。
4. 运行入口单测、TypeScript、格式与相关治理检查；使用真实当前 checkout 复现并记录漂移原因。
