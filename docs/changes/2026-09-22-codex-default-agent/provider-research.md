# 厂商模型目录与参数研究（2026-09-22）

本轮按用户指示优先适配工程现有 OpenAI 兼容连接。以下为官方文档核对，不代表已逐厂商付费出图验收。

| 来源 | 核实事实 | 本轮实现边界 |
| --- | --- | --- |
| [OpenAI Images](https://developers.openai.com/api/docs/guides/image-generation)、[Models](https://platform.openai.com/docs/api-reference/models/object) | model、size、quality 独立；标准模型目录没有完整能力规格 | 保留真实 ID；精确尺寸由明确目录扩展或手动文档声明提供，不从型号名编造 size/quality |
| [Gemini 图片生成](https://ai.google.dev/gemini-api/docs/image-generation) | 原生协议包含图片比例/分辨率配置，不同模型可用档位不同 | 2K/4K 不能统一换算为某个像素值；原生协议另立适配任务 |
| [Qwen Image](https://help.aliyun.com/en/model-studio/qwen-image-generation-and-editing-api-reference) | OpenAI 兼容与 DashScope 的尺寸字段位置、分隔符不同 | 当前只接受已配置兼容接口；不根据厂家名称改写协议 |
| [火山图像处理器](https://www.volcengine.com/docs/6492/2221472?lang=zh) | size 可为像素或档位，依赖服务端支持；主 Images 页面抓取未成功 | 未硬编码未经确认的全量型号规格；主入口 https://www.volcengine.com/docs/82379/1541523 留待专项适配 |
| [OpenRouter Image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) | 目录/参数可按模型或端点声明，模型级并集不能冒充每个端点支持范围 | 此专用协议尚未实现，不把通用 /models 的成功当作该协议验收 |
| [New API 渠道管理](https://docs.newapi.pro/zh/docs/guide/feature-guide/admin/channel) | 支持模型名映射、参数覆盖，后缀可能本身就是网关路由名 | foo-2k-high 原样提交；分组只影响 UI，切参数选择另一条已发现的准确 ID |

本轮目录读取 `data[].id` 和可选 `capabilities.modalities/sizes`。后者是受支持的扩展，不是 OpenAI 标准承诺。未提供用途的型号保持 unknown，设置可按厂商文档声明。目录与 URL、credentialRef、connectionId 绑定，刷新保留该身份下的人工声明。特殊官方/优先/低价渠道通过手动 family/variant/aliases 表示，绝不把不同连接合并。

搜索数值不纠错：2K 不匹配 4K，16:9 不匹配 9:16，版本 1.5 不匹配 1.6。文本纠错只提供候选，用户选择才改变模型。名称中的档位可以被搜索，但不证明额外请求字段可用；卡片可发送的尺寸仍来自明确声明，并在提交门禁再次验证。
