# Spec

- ID：TASK-UI-CLOSE-003；基线为整合分支的 current main。
- 来源：Figma 文件 0nU0A7pq6eyjwfwm1TtWkO；有效可取得节点为 410:67357、399:27506、388:938、392:938/398:26864、394:938、395:938、396:938。Landing 410:59708 返回 INVALID_ARGUMENT，缺失来源保持 PARTIAL。
- 范围：快捷键弹层外框语义 token、同状态浏览器 computed style/截图、菜单互斥、Escape/外部点击/窄屏焦点回收。工程补充状态不可写成 Figma 定义。
- 验收：dev1421、preview1423、Tauri release 均加载当前候选；快捷键边框 rgb(60,60,60)；页面无 page error；缺失 Frame 明确记录。
