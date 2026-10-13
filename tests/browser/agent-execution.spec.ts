import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import { startAgentServer } from "../helpers/agentServer";
import { openSeededProject } from "./helpers";

test("执行过程可折叠，活动结果、审批和中断只按实际回执显示", async ({
  page,
}, testInfo) => {
  const agent = await startAgentServer("idle");
  try {
    await page.addInitScript(
      (endpoint) => localStorage.setItem("canvas-agent-url", endpoint),
      agent.url,
    );
    await openSeededProject(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    const emit = (id: string, phase: string, fields: object = {}) =>
      agent.emit("agent_event", {
        thread_id: "fixture-thread",
        turn_id: "execution-turn",
        type: `item.${phase}`,
        item: { id, type: "command_execution", ...fields },
      });
    agent.emit("codex_state", { busy: true });
    emit("command-1", "started", { command: "npm test" });
    emit("command-1", "updated", { delta: "checking\n" });
    const process = page.locator(".chat-agent-execution").first();
    await expect(process.locator("summary")).toContainText("执行中");
    await expect(process).not.toHaveAttribute("open");
    await process.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(process).toHaveAttribute("open", "");
    await expect(process.locator(".chat-agent-execution-item")).toHaveCount(1);
    await expect(process).toContainText("npm test");
    await expect(process).toContainText("checking");

    emit("command-1", "completed", {
      exitCode: 1,
      aggregatedOutput: "checking\nfailed assertion",
    });
    emit("command-1", "updated", { delta: "late output" });
    await expect(process).toContainText("失败");
    await expect(process).toContainText("failed assertion");
    await expect(process).not.toContainText("late output");
    emit("command-2", "completed", { command: "unknown result" });
    await expect(process).toContainText("结果未报告");
    emit("command-3", "completed", { command: "exit 0", exitCode: 0 });
    await expect(process).toContainText("成功");
    emit("command-4", "started", { command: "waiting command" });
    agent.emit("codex_approval", {
      requestId: "execution-approval",
      method: "shell",
      command: "waiting command",
      threadId: "fixture-thread",
      turnId: "execution-turn",
    });
    await expect(page.locator(".chat-agent-banner")).toContainText("等待确认");
    await page.getByRole("button", { name: "允许", exact: true }).click();
    expect(agent.decisions.at(-1)).toMatchObject({ decision: "accept" });
    await expect(page.locator(".chat-approval")).toHaveCount(0);

    agent.failActions(true);
    await page.getByRole("button", { name: "停止", exact: true }).click();
    await expect(
      page.locator(".chat-agent-messages").getByRole("alert"),
    ).toContainText("受控服务暂时不可用");
    await expect(
      page.getByRole("button", { name: "停止", exact: true }),
    ).toBeVisible();
    await expect(process).toContainText("执行中");
    agent.emit("agent_event", {
      thread_id: "fixture-thread",
      turn_id: "execution-turn",
      type: "turn.completed",
      status: "interrupted",
    });
    await expect(process).toContainText("已中断");
    await expect(
      page.getByRole("button", { name: "停止", exact: true }),
    ).toHaveCount(0);
    agent.emit("agent_event", {
      thread_id: "other-thread",
      turn_id: "execution-turn",
      type: "item.started",
      item: { id: "foreign", type: "command_execution", command: "private" },
    });
    agent.emit("agent_event", {
      thread_id: "fixture-thread",
      turn_id: "execution-turn",
      type: "item.completed",
      item: { id: "answer", type: "agent_message", text: "保留最终回答" },
    });
    await expect(page.locator(".chat-agent-item.is-assistant")).toContainText(
      "保留最终回答",
    );
    await expect(process).not.toContainText("private");
    await expect(process.locator(".chat-agent-execution-item")).toHaveCount(4);
    for (const width of [1920, 1099, 390]) {
      await page.setViewportSize({ width, height: 1080 });
      const opener = page.getByRole("button", {
        name: "打开对话",
        exact: true,
      });
      if (await opener.isVisible()) await opener.click();
      await expect(process.locator("summary")).toBeVisible();
      const geometry = await process.evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        fontSize: getComputedStyle(element.querySelector("summary")!).fontSize,
        text: (element as HTMLElement).innerText,
        url: location.href,
        mode: document.querySelector(".app")?.getAttribute("data-runtime-mode"),
        scripts: [...document.scripts]
          .map((script) => script.src)
          .filter(Boolean),
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(
        geometry.clientWidth + 1,
      );
      expect(Number.parseFloat(geometry.fontSize)).toBeGreaterThanOrEqual(12);
      await process.screenshot({
        path: testInfo.outputPath(`execution-${width}.png`),
      });
      await fs.writeFile(
        testInfo.outputPath(`execution-${width}.dom.json`),
        JSON.stringify(geometry, null, 2),
      );
    }
    await process.locator("summary").click();
    await expect(process).not.toHaveAttribute("open");
    await expect(page.locator(".chat-agent-item.is-assistant")).toBeVisible();
    expect(agent.turns).toHaveLength(0);
  } finally {
    await agent.close();
  }
});
