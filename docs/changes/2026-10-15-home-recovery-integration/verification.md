# Verification：首页恢复

- Task ID：TASK-CODEX-HOME-20261015；状态：NOT VERIFIED；[Plan](plan.md)。
- 基线main3a992597 / 安全堆叠f9c6aa71，产品仍2.1.33。前置安全源码9aa完整verify及47文件独审通过，PR62当前Hosted中，不代填HOME结果。
- 本任务尚未运行RED、修复、当前版本完整验证或客户端验收。全部新产物将写入独立run及工程外清单；旧失败与九项目保留。
- 领取时governance正确拦截同树两个active任务（GDI仍REVIEW）；现将已推送冻结PR62的GDI停在PARTIAL/等待Hosted，root串行领取HOME为唯一active写入。没有新建worktree或唤醒原会话，安全PR源码不再修改。

## 当前dirty运行证据

- Node连接新增6项首轮5个有效RED/1个显式新会话保护PASS。第一版newThread计数用了错误URL，修正为真实threads/new后重新RED；不把夹具错误当产品失败。共享flight/同凭据幂等后6/6 GREEN。
- 本机HTTP邻域首次sandbox 39PASS/6FAIL并fetch failed；同源码正常Windows权限45/45 PASS，未改断言。新增重复完成通知RED 2次原图读取；独审HOME-EPOCH-01提示后补实际RED：旧连接usage阻塞，新thread-new就绪后释放旧usage，错误读取thread-new/old-project-image。按epoch/image共享导入与尾部epoch检查后46/46 PASS。
- 两个浏览器真实RED（不重试）分别得到旧prompt A仍持久化、实际turn.messageMetadata undefined。修复只清本次pending草稿所有权并限HOME图片来源；手动编辑B/替换附件仅发一次B，发送中C保留，homeDraft/项目历史附件不变，重载不复活A；普通图片聊天无生成来源标签。
- 来源首轮GREEN失败为夹具仅发terminal但服务hello仍busy，补真实ready/busy=false；随后发现双完成通知重复取图，未删除1次原图断言，已实际单测RED并修复。全文件8项最新首试通过（14.7s/0retry），包括1原图/1结果/1来源边/重载无重复。
- 全文件首轮数量1/4失败及单项不变源码PASS都保留。静态线索为初始emptySnapshot=1、读取中输入导致整个新homeDraft覆盖seed4；工程外控制IndexedDB读取的探针实际证明seed4→读取期编辑→持久count1，文字保留。探针首轮cwd错与未等落盘失败保留，最终观察PASS仅证明问题存在，不是修复。原随机失败具体时序未记录，因果推断单列；正式回归补等待真实读取提示消失，并仍断言4张。新问题挂TASK-HOME-LOAD-DRAFT-20261015，不伪称已解决。
- 日志均在工程外统一证据根，home-connection-red-valid.log / home-connection-image-epoch-green.log / home-retry-red.log / home-retry-coalesced-neighborhood.log / home-loading-observation-durable.log。运行sourceHead为f9c基线上dirty，不能声称最终冻结SHA通过；源码冻结后须完整verify。
- Desktop/Web源码2.1.33→2.1.34由version:bump产生，Mobile2.1.1不变；尚未新Tauri构建/真实客户端验收。PR62仍待Hosted，不提前合并或更换daily。
