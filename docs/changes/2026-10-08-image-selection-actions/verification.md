# Verification：TASK-UI-011

- 日期：2026-10-08；状态：IN_PROGRESS；[Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Review](review.md)。
- 起始 main@5dd6e6dd；独立 npm ci 完成（root 244 / Agent / plugins 自有安装）。
- 已只读确认偏差：ImageCreationNode 的 image-preview-actions 位于 image-preview 内部，单击 uploaded-image 打开预览；DemoResultNode 的图片结果操作常驻 footer。
- 模型任务已提交到 2797687c、原工作树 clean；本任务不编辑其工作树，后续集成复核其能力/参考图门禁。
- 基线、RED、实际 production Web/native、computed geometry、完整回归及精确提交记录随后按真实结果追加，不预写 PASS。

## 当前实现与真实验证进展

共用屏幕坐标工具栏实现于图片上方；参考图/结果图保留原件、比较、收藏、删除、重绘和审批链路。修正 pointer capture 后，单击仅选择、双击预览；空白菜单测试改为定位真实空白，额外发现并修复自动 reveal 消耗撤销的问题，手动平移/缩放和取消 redo 保持独立记录。新页面审计修正设置、Google 连接、资源页与工作台六阶段的字号/32px控件/按钮层级。

起始 main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232，未提交候选。第一次完整 verify 的静态/类型/716 root（708 pass，8既有 skip）/174 Agent（172 pass，2既有skip）/UI/format/build 均通过；浏览器409/411，两项真实空白与自动视口 undo 回归失败，保留 verify-first 日志。修复后相关26/26、retries=0；后续默认12worker全量运行394 pass、4 failed、13 flaky，失败为page创建/现有DOM操作/download的时间耗尽，未降低断言或提高timeout。相同产物以1worker/0retry复验主题与数据17/17通过；不能倒推原超时唯一根因，也不能把此结果称为全量PASS。原始失败/修复日志在 D:/kk-studio/.verification/TASK-UI-011-image-selection-actions。

Native曾实际运行13组通过，但当时结果位于Playwright会清除的test-results，结构收据被后续测试清理；只有控制台日志保留，不作为最终可回读的完整native验收。harness已改为.tmp/desktop/image-selection独立目录，源码/EXE/bundle指纹与干净profile/data根另记，待最新主线源码重建后重验。

模型任务最终12f5f6ab的独立审查/408browser零flaky与两轮Hosted已通过，PR36按当前会话明确合并授权合入main@1af0357b088df79dc51e9b309ef310a500722cf8。本UI任务将merge该main并复验能力/引用门禁；T5当前Hosted原生启动失败，未合入，也未假填完成。当前交付与独立审查仍IN_PROGRESS。

## 最新主线组合与独立审查返修

172d128f4e3d018db81b9c8f47892e2aad6cc891 已合入 main@1af0357b088df79dc51e9b309ef310a500722cf8，保留精确模型/编辑能力门禁和重绘入站参考图去重计数。该 source 的完整 verify PASS：root 731/723 pass/8 原 skip、Agent174/172/2原skip；浏览器419/419、0flaky/0unexpected/0skipped/0retry，默认12workers。[完整记录](evidence/web-model-integration/summary.json)与实际 browser-results reporter 已保存，旧 docs/evidence/browser-results.json 不能作为本轮结果。fresh Tauri client:build -- --no-bundle 后[13组原生收据](evidence/native-172d128/receipt.json) passed/cleanupComplete=true、errors=[]；EXE 6ff89b5d3634e16c8f4f251ac821426dbd252f91d967a0026bdb6555c293a1d1，实际加载 index-ukYGTF_q.js / index-IzECDsqI.css。它们只对应旧source，不代替下述修复后验收。

独立 reviewer /root/task_audit_reviewer 对 base1af → head172d128 结论 CHANGES REQUIRED（两项P2）。原生及Web的页面审计当时使用空 tasks，不能证明非空任务动作；reviewer返回了完整会话报告，报告文件因只读执行限制未保存，技术结论仍留在审查记录。

UI011-R1：已选择图片拖到画布顶部时工具栏直接隐藏，Escape后同图重选跳过reveal。[真实RED](evidence/review-regressions/top-boundary-red.txt)后增加手势结束与重选回归；390px补测还实测顶部两排HUD组合占满可用宽度（[几何](evidence/review-regressions/top-compact-diagnostic.txt)）。现在工具栏定位与自动视口共享真实DOM几何，先寻找可放首个动作的最近空行，手势中不重定位，自动reveal继续不消耗额外undo。390/1099/1920均覆盖拖到顶部、取消后平移与同图重选。

UI011-R2：非空队列按钮27px、单项重试22px；补入真实createTask的failed/failed-output fixture后[390/1920 RED](evidence/review-regressions/queue-actions-red.txt)。取消/暂停/恢复/重试及评论区动作统一共享32px按钮；清除局部padding/font覆盖。补测又检出‘添加评论’34px，已修复。Web/native六阶段都用非空任务，采样明确覆盖实际任务与输出按钮，真实运行中暂停/取消另用原Provider fixture回归。

第一次共享几何返修39/40通过但使空卡片连线释放位置改变，原[失败](evidence/review-regressions/geometry-complete.txt)保留；修正仅有真实图片且需要空间时增加headroom，不改变空卡片/非图片reveal。[16项图片/连线定向复验](evidence/review-regressions/geometry-final-green.txt)全通过、1worker/0retry；完整verify、修复后fresh native与精确新head补审继续进行，任务保持IN_PROGRESS。

0c3bb9b675a03dc91642630ae961bd5da61247fd 修复后完整verify PASS，422/422浏览器零flaky；独立补审 R2 CLOSED、R1参考路径修好但结果路径仍CHANGES REQUIRED。结果Toolbar用article，controls用内部preview，高差会漏掉顶部恢复；新增真实生成/归档结果的三个宽度拖顶/取消平移重选，取得[实际RED](evidence/review-regressions/result-top-anchor-red.txt)。恢复选择器改为与Toolbar一致的结果article/参考preview。首轮25/26通过，重选测试在窄屏直接点击被HUD覆盖的图片中心发生超时，保留[设置失败](evidence/review-regressions/result-anchor-green.txt)；改为实际可见图片底部点击，没有force、延长timeout或弱化动作。结果三个宽度及收藏/重绘原件字节/单次请求/对比/删除保留原件的[完整用例PASS](evidence/review-regressions/result-anchor-final-green.txt)。当前source重新full/native取证后再精确补审。
