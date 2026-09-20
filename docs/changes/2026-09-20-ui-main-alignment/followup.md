# Follow-up: narrow sidebar dismissal and test I/O budget

原 PR #3/#5 已合并；本补充从 main@a1d8629 建立独立任务分支。

## 复现与修复

1920宽打开账号菜单 → 改为390宽 → 聚焦侧栏toggle并按Enter展开 → 点击创建项目文件夹。修复前账号菜单仍然存在。Sidebar的窄屏关闭hook晚注册后占据共享dismissible栈顶，拦截菜单外部关闭。现仅在没有账号/排序菜单时启用侧栏关闭hook，先关闭顶层菜单，再让外部点击收起侧栏；按钮功能和焦点处理保留。

补充真实序列回归；同时将重绘任务完成的timeout正确放入expect.poll选项。重绘请求由提前注册的route捕获；批准点击完成后再开始15秒I/O轮询，避免将点击可操作性等待计入请求预算，不会漏掉点击期间已发出的请求。

云端b65fbca的一条检查因大图重绘两次超过15秒失败，另一条的verify通过。20倍CPU profile显示：归档/请求转换的逐字节回调和浏览器同步大快照镜像占用主线程。将assetRepository与imageGeneration两处Uint8Array.from(binary,callback)改为预分配数组及索引写入，原图、MIME、大小校验和存储契约保持一致。该局部优化减少转换开销，没有消除同步大快照与大规模素材库瓶颈。

## 验证

最终完整verify的lint/typecheck/150 Node/UI119/0/format/build通过，浏览器191/191通过，0失败、0重试。中途一次unknown用例重试已定位为测试helper在异步持久写入完成前瞬时检查审批按钮，导致跳过批准；现默认等待审批，模拟写入失败用例明确不批准，业务安全断言不变。历史重试记录保留在本地日志。unknown和此前云端重试的音频用例曾分别单worker、无retry重复5次，10/10通过。此前误并行运行client build重写dist曾导致page.goto错误，已修正验证顺序。重新构建Tauri release通过。

开发1421、production preview1423、隔离Tauri release均通过composer生命周期与窄屏账号回归，报告见docs/evidence/2026-09-20-ui-main-alignment/followup/；窄屏为Playwright device metrics 390×844，未冒充物理窗口尺寸。入口仍为src/main.tsx→App.tsx→Sidebar。最终bundle=index-Be6XJzPc.js，CSS未改，各环境pageErrors为空。

原2.35MB大图重绘用例在正常环境及6倍CPU限速重复3次通过。旧实现20倍CPU限速超时记录保留；本次字节转换优化及等待阶段校正后，20倍CPU限速连续3次通过。保留真实原图和完整原图字节断言，没有用更小fixture替换原图。PERF-001仍未关闭：原件与预览分离、按需加载及大规模素材库测量尚待完成。

本补充没有新增设计稿：UI-004仍缺Landing等独立现行Figma节点。TASK-GOV-002的PR #4保持由其独立任务处理。

独立只读审查：/root/main_integration_audit 核对菜单补充和后续字节转换diff，未发现高风险回归；确认关闭优先级、字节等价性以及提前注册route不会漏掉点击期间请求。此结论不是GitHub人工approval。

字节转换独立microbenchmark见byte-conversion-benchmark.json：同一2,348,046字节输入、Edge/20倍CPU，旧实现约2.8–3.5秒，索引写入约0.10–0.14秒，三次逐字节一致。该数字仅描述字节转换，不是整条生成链耗时。
