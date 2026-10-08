# Plan：TASK-IMAGE-RETRY-004

1. 从6a主线建立独立工作树并登记任务；保存绑定SHA的托管原日志。
2. 以受控第四次返回延迟复现旧等待先匹配第三条succeeded。
3. 最小改为等待新任务数量/身份，再等待该身份终态；保留全部group、POST和像素断言。
4. 零重试定向回归、完整verify、相关Rust/构建、独立精确SHA审查与当前CI/delivery。普通PR合并后再读主线CI。
