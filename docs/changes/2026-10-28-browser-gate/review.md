# 审查

自审与独审待固定实际diff/SHA后执行。重点：没有全局替换主导航“扩展”；只更新设置测试入口；原断言未删除/跳过/弱化；失败如实记录。

自审：diff仅测试定位/精确预期及本卡治理记录，后续业务断言保留。当前分类依据SETTINGS_SECTIONS与其契约单测；引用完整对象依据canvasReferences.ts:55–60。29项定向与开发插件PASS；完整verify仍PARTIAL。独立审查等待本次提交固定SHA。

用户最新禁止子代理；本卡7eca983c仅作者自审，independent review保持NOT VERIFIED。现有安全1e63b722与格式af4c4e2独审均只对原base/head及其范围有效。完整verify确认仍有浏览器失败后主动中断，未满足合流条件。测试文件计数按真实diff勘误为17。
