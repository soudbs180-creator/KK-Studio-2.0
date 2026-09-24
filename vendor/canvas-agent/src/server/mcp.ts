import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { runCodeBuddy } from "../agent/codebuddy.js";
import { toolDescriptions, toolInputSchemas, toolNames, type ToolName } from "../canvas/schemas.js";
import { AGENT_PROMPT, loadConfig, type CanvasAgentConfig, VERSION } from "../config.js";

type CanvasAgentToolResponse = { ok?: boolean; result?: unknown; error?: string };

/** 启动通过标准输入输出通信的 MCP 服务。 */
export async function startMcpServer() {
    const config = loadConfig(true);
    const server = new McpServer({ name: "canvas-agent", version: VERSION }, { instructions: AGENT_PROMPT });
    toolNames.forEach((name) => registerCanvasTool(server, config, name));
    server.registerTool("codebuddy_consult", {
        description: "将不超过 3000 字的独立短文案、标签或摘要问题委派给本机已登录 CodeBuddy。只发送此轮 prompt；不要传密钥、完整记忆、整份项目素材或历史对话。Codex 负责判断和最终回复。",
        inputSchema: { prompt: z.string().trim().min(1).max(3000) },
    }, async ({ prompt }) => {
        const cliPath = loadConfig().codebuddy?.cliPath;
        if (!cliPath) return { isError: true, content: [{ type: "text" as const, text: "尚未在 KK 设置中配置 CodeBuddy CLI 路径" }] };
        try {
            const result = await runCodeBuddy({ cliPath, prompt });
            return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        } catch (error) {
            return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : "CodeBuddy 调用失败" }] };
        }
    });
    await server.connect(new StdioServerTransport());
}

/** 向 MCP Server 注册单个 Canvas Agent 工具。 */
function registerCanvasTool(server: McpServer, config: CanvasAgentConfig, name: ToolName) {
    const schema = toolInputSchemas[name];
    server.registerTool(name, { description: toolDescriptions[name], inputSchema: schema.shape }, async (input: unknown) => {
        const result = await postCanvasAgentTool(config, name, schema.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    });
}

/** 将 MCP 工具调用转发到本地 Canvas Agent HTTP 服务。 */
async function postCanvasAgentTool(config: CanvasAgentConfig, name: ToolName, input: unknown) {
    const res = await fetch(`${config.url}/api/tools`, { method: "POST", headers: { "content-type": "application/json", "x-canvas-agent-token": config.token }, body: JSON.stringify({ name, input }) });
    const body = (await res.json()) as CanvasAgentToolResponse;
    if (!body.ok) throw new Error(body.error || "tool call failed");
    return body.result;
}
