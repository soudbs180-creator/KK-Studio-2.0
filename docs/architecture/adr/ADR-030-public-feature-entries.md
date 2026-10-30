# ADR-030：公开切片出口与宿主端口

- 状态：PROPOSED；候选实现，运行与独审分别验收。
- 日期 / Owner：2026-10-29 / root
- 任务：TASK-MOD-P4-SKILLS、PLUGINS、MODELS、AGENT、CREATION、REMAINING。
- 来源：[MODULARITY](../MODULARITY.md)、[四文档清单](../../changes/2026-10-28-modularity-p0/four-document-coverage.md)。

## 决定

按五个目标切片顺序改公开index，再处理其余82条；保留命名、type-only、默认导出别名和动态入口的符号身份。不改R1守卫或扩大baseline。App的CSS显式导入顺序保留，运行时副作用另验。

R3禁止integrations依赖feature，即使改成index仍违规。因此浏览器纯状态机/协议及模型上下文纯函数归domain，模型目录持久化归integrations/providers，旧文件保留单向导出；凭据复用已下沉vault。OpenAI adapter改显式接收宿主生成方法，唯一生产调用点注入原generateImages；无端口返回不可用，不使用动态导入隐藏依赖。

公开出口包含UI；Node原生TS无法编译TSX，单元入口用已安装TypeScript编译TSX并解析已有无后缀相对路径，仅单测忽略CSS执行。测试算法、断言和跳过数不弱化，CSS和渲染继续由真实Edge验收。修正VM夹具的模块入口，同时保留原注入函数。Agent生命周期默认连接在操作时读取，避免barrel求值时过早读取单例；生命周期/生成回归实际执行。

未采用扩大基线、计算属性动态导入或白名单绕过。未采用再建状态源或复制算法。旧导出至少保留一个正式发布周期，退役纳入TASK-MOD-P3-COMPAT；回退当前P4提交不迁移用户数据。

## 验收与限制

完整图R1=0、R3=0、R4=0；其他基线不新增。类型、根lint/全测、构建、主包预算、CSS与相同状态DOM/PNG逐项留证。新增生成端口测试拒绝未装配并确认单次提交。Desktop/Web源码同属2.1.50；Mobile实现未改。无独立审查或原生/真实Provider证据时保持PARTIAL；既有浏览器失败不删除。
