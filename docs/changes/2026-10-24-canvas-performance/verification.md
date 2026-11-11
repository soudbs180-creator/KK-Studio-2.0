# Verification：画布轻量性能优化第一批

- Task ID：TASK-CANVAS-PERF-20261024；记录状态：IN PROGRESS；交付包角色：current
- 日期：2026-10-24，Asia/Shanghai；cwd：`D:/kk-studio/KK-Studio-2.0`
- branch：`docs/TASK-FIGMA-FIRST-20261021-rules`；base/head：`1fbac26b33bdabaad682ad398f5292360eb9c66a` + 本地 dirty。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。
- 原始证据：工作区 `output/canvas-performance-20261024-8b27aa/`；pre-edit source hashes/status/index 已保全。Node 24.20.0。

## 已执行

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 开工前 npm test | PASS，2275 pass / 0 fail / 20 skipped | baseline-unit.log |
| 开工前 npm run typecheck | PASS exit0 | baseline-typecheck.log |
| 开工前 npm run lint | PASS exit0；58 health及1 footguns既有advisory | baseline-lint.log |
| 当前 Figma | 只读规范与状态结构核对，无需设计修改 | spec 内时间与节点；无像素验收 |
| 历史RED→GREEN | 100帧预览原有100次协调/连接协调/指纹；候选均0，完成提交1次 | history-red.log、history-green.log及后续边界日志 |
| storage RED→GREEN | 20项目100次预览：协调2000→100；Web100次规范化200→100；Desktop一次异步规范化2→1 | storage/red-hooks.log、red-storage-corrected.log、green-safety.log（76/76） |
| 持久化参照指纹 | 同props100次无关render增量0；100次预览逐次发布、同态ACK无回环、冲突ACK修复 | tests/unit/canvasPersistencePerformance.test.ts |
| 图输入变更/恢复 | 聊天更新和项目重排不协调图；新增/换items/canvas重新协调；删除清理位置/边/组成员；journal即时可恢复 | creationSaveQueue、snapshotPersistencePerformance定向回归 |
| 渲染RED→GREEN | 原4项失败→最终6项首试通过；200条独立边100次pan的geometry调用0，移动一端仅关联边1次 | render/下RED与green-final.log及run1477ed5a-c372-4bc3-8f22-c42399cbc1ef |
| 自动保存生命周期 | 179ms无写、下一提交取消旧timer、180ms仅最新revision、卸载清理；缺失effect变异确实失败 | autosave-harness-red.log、autosave-lifecycle-green.log、review-storage变异收据 |
| 独立审查 | 当前43/43定向通过，无已证实本批P0–P3产品缺陷 | review-storage/review-final.md、final-source-hashes.json |
| 首轮完整verify | lint/typecheck PASS，单元2290pass/0fail/20skip，Agent204pass/0fail/2skip，agent:build/ui:check PASS；format FAIL于本批history换行 | verify-final.log；未进入后续UI/设计/development |
| 格式修复 | 仅history依赖列表换行；全量format PASS，重建入口字节不变 | format-final.log、browser-final/rebuild-hash-check.json |
| 扩展浏览器 | 35项：30pass/5fail/0flaky/0skip；失败4项为证据cwd下相对媒体fixture缺失，1项旧API按钮选择器超时 | browser-final/，run5282d01e-2bed-41dc-a84d-e5255d37a698，40条trace保留 |
| 第二轮完整verify | 正在从repo cwd跑866项UI；已通过前置lint/typecheck/unit/Agent/ui/format，浏览器尚未全绿 | verify-after-format.log；最终结果待追加 |

## 运行态与外部边界

浏览器使用真实Edge156、固定 `http://127.0.0.1:1423/`、Vite production preview。route `/` 的active workspace → `src/main.tsx` → `src/App.tsx` → `Canvas.tsx` → `CanvasNodeLayer.tsx` → `CanvasConnections.tsx` / `CanvasConnectionItem.tsx`。trace核对入口 `data-runtime-entry=src/main.tsx` / `data-runtime-mode=production` 和实际JS请求；静态dist hash与请求身份分开记录，不虚称trace保存了HTTP JS响应字节。

最终入口 `index-B7ou-5el.js`，SHA256 `d89a4e02a862063fcf9d37ac219d7f1fe50e4bf13b7ce47bb24fa99315af002a`；CSS仍 `index-FilAzOB9.css`。框选截图目视主体对齐、端点DOM断言通过；种子项目颜色不同，不能称像素完全一致或Figma全量同步。格式修复后再次build，入口文件和字节hash相同。

Desktop/Web源码版本 `2.1.42 → 2.1.43`，Mobile保持 `2.1.42`；版本脚本运行，原index tree `be5c41e3ff0989e24e13dd1e6c5e1651b0115914` 保持。被审源码/测试/版本20文件副本、hash及本任务patch见证据根 `final-source-manifest.json` / `task-only.patch`，不能用HEAD单独代表dirty候选。

Tauri包/原生重启、Hosted、真实Provider、长期内存压力、Figma全量视觉同步均未验证，不由本批单元计数代填。

## 轻量预算与实际收益边界

Node24.20.0，`node:zlib gzipSync` level9：冻结主入口778735raw / 253631gzip字节；候选779180raw / 253819gzip，增量445raw / **188gzip字节（0.0741%）**，低于16384字节预算。没有新增运行或开发依赖，package-lock仅版本镜像变化；5个插件public/dist字节一致。完整JS/CSS文件清单与hash保留在 `browser-final/size-receipt.json`，基线构建清单见 `browser-baseline/build.log`。

减少的是已测量的扫描、协调、规范化与几何计算，不等于整体FPS、输入到显示延迟或heap已达标。Web完整JSON.stringify仍执行；App Context/节点handler广播、离屏裁剪、媒体解码与内存预算、Worker/渲染器选择仍需后续测量。所有节点并未因此停止重渲染。

## 失败归因纪律

保存生命周期harness缺口由独审变异发现并关闭，保留旧证据。追加视频终态用例初稿错误使用image，而既有函数只结算video/demo；修正夹具到领域契约后通过，未修改产品以满足错误测试。全量UI失败另按真实error-context核对，不能仅因不在本批diff就断言开工前已失败。

## 结论

8个产品文件的本地候选已实现，定向计数、数据/行为与独审通过；完整UI验收仍进行中且已有失败，不合并或发布，也不称整体大画布问题已解决。后续追加全量结果和必要复验，不覆盖历史失败。
