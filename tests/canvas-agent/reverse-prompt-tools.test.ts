import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";
import test from "node:test";
import { toolDescriptions, toolInputSchemas, toolNames } from "../../vendor/canvas-agent/src/canvas/schemas.ts";
import { CanvasSession } from "../../vendor/canvas-agent/src/canvas/session.ts";

test("reverse prompt flow and get result tools are registered in schemas", () => {
    assert.equal(toolNames.includes("canvas_create_reverse_prompt_flow"), true);
    assert.equal(toolNames.includes("canvas_get_result"), true);

    assert.ok(toolDescriptions.canvas_create_reverse_prompt_flow);
    assert.ok(toolDescriptions.canvas_get_result);

    const validFlowInput = toolInputSchemas.canvas_create_reverse_prompt_flow.parse({
        imageNodeId: "image-123",
        autoRun: true,
        prompt: "定制反推文案",
        model: "flux-schnell",
    });
    assert.equal(validFlowInput.imageNodeId, "image-123");
    assert.equal(validFlowInput.autoRun, true);
    assert.equal(validFlowInput.prompt, "定制反推文案");

    const validGetResultInput = toolInputSchemas.canvas_get_result.parse({
        nodeId: "config-456",
        wait: false,
    });
    assert.equal(validGetResultInput.nodeId, "config-456");
    assert.equal(validGetResultInput.wait, false);

    assert.throws(() => {
        toolInputSchemas.canvas_get_result.parse({});
    });
});

test("session forwards canvas_create_reverse_prompt_flow and canvas_get_result to active client", async (t) => {
    const session = new CanvasSession();
    const client = connect(session, "test-client");
    t.after(() => {
        client.close();
    });

    const flowPromise = session.callTool("canvas_create_reverse_prompt_flow", {
        imageNodeId: "image-1",
        autoRun: false,
    });
    const flowEvent = client.popEvent("tool_call") as Record<string, unknown>;
    assert.ok(flowEvent);
    assert.equal(flowEvent.name, "canvas_create_reverse_prompt_flow");
    assert.equal((flowEvent.input as Record<string, unknown>).imageNodeId, "image-1");

    session.resolveResult("test-client", {
        requestId: String(flowEvent.requestId),
        result: {
            ok: true,
            imageNodeId: "image-1",
            textNodeId: "text-1",
            configNodeId: "config-1",
            connections: [
                { fromNodeId: "image-1", toNodeId: "text-1" },
                { fromNodeId: "text-1", toNodeId: "config-1" },
            ],
            autoRun: false,
        },
    });
    const flowResult = (await flowPromise) as Record<string, unknown>;
    assert.equal(flowResult.ok, true);
    assert.equal(flowResult.textNodeId, "text-1");

    const getResultPromise = session.callTool("canvas_get_result", {
        nodeId: "config-1",
    });
    const getResultEvent = client.popEvent("tool_call") as Record<string, unknown>;
    assert.ok(getResultEvent);
    assert.equal(getResultEvent.name, "canvas_get_result");
    assert.equal((getResultEvent.input as Record<string, unknown>).nodeId, "config-1");

    session.resolveResult("test-client", {
        requestId: String(getResultEvent.requestId),
        result: {
            ok: true,
            nodeId: "config-1",
            status: "ready",
            ready: true,
            result: { id: "res-1", kind: "image", description: "demo", source: "demo" },
        },
    });
    const resultObj = (await getResultPromise) as Record<string, unknown>;
    assert.equal(resultObj.ok, true);
    assert.equal(resultObj.ready, true);
});

test("session rejects reverse prompt tools when no client is connected", async () => {
    const session = new CanvasSession();
    await assert.rejects(
        session.callTool("canvas_create_reverse_prompt_flow", { imageNodeId: "img-1" }),
        /当前没有已连接网页/,
    );
    await assert.rejects(
        session.callTool("canvas_get_result", { nodeId: "cfg-1" }),
        /当前没有已连接网页/,
    );
});

function connect(session: CanvasSession, clientId: string) {
    const response = new FakeSseResponse();
    const url = new URL(`http://127.0.0.1/events?clientId=${clientId}`);
    session.openEvents(url, response as unknown as ServerResponse);
    return response;
}

class FakeSseResponse extends EventEmitter {
    private chunks: string[] = [];

    writeHead() {
        return this;
    }

    write(chunk: string) {
        this.chunks.push(chunk);
        return true;
    }

    event(type: string) {
        return this.events(type)[0];
    }

    popEvent(type: string) {
        const index = this.chunks.findIndex((chunk) => chunk.startsWith(`event: ${type}\n`));
        if (index < 0) return undefined;
        const chunk = this.chunks.splice(index, 1)[0];
        const data = chunk.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
        return data ? JSON.parse(data) : undefined;
    }

    events(type: string) {
        return this.chunks.flatMap((chunk) => {
            if (!chunk.startsWith(`event: ${type}\n`)) return [];
            const data = chunk.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
            return data ? [JSON.parse(data) as unknown] : [];
        });
    }

    close() {
        this.emit("close");
    }
}
