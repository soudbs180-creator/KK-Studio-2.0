# 测试契约

当前分类真值为src/components/settings/SettingsSectionData.ts与settingsNavigation.test.ts：通用设置、网络与代理、记忆管理、扩展与 MCP。当前对应分类已存在，无需产品/Figma改动。

仅把测试调用的旧分类名替换为当前名，保留后续可触达、状态、原件保护、恢复等断言。主导航“扩展”与设置中的“扩展与 MCP”是不同入口，禁止全局字符串替换。

原始RED来自格式卡verify.log和development.log；先重跑代表浏览器/真实开发插件，再执行快速门禁。完整套件仍有其他失败时明确记录，不跳过或扩大豁免。

追加已复现的过时断言：reference derivation现有契约已携带assetId/kind/frame/slot，旧精确断言漏掉这四个字段；按canvasReferences.ts:55–60及CanvasReference补齐完整预期，仍使用toEqual，不改成局部匹配或跳过。该修正只描述已有图像引用输出。
