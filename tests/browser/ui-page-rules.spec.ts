import { test } from "@playwright/test";
import { inspectPage } from "./uiPageRules";
import {
  CREATION_STORAGE_KEY,
  createTask,
  emptySnapshot,
  projectChatView,
  serializeCreationSnapshot,
} from "../../src/features/creation/model";
import { stageProject } from "../fixtures/stage-project";
import { expandSidebar, openSettingsSection } from "./helpers";

for (const width of [390, 1920]) {
  test(`模型设置与资源页遵循现行 UI 规则 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto("/");
    await openSettingsSection(page, "模型接入");
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "model-settings",
      info,
    );
    await page
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
    await page
      .getByRole("button", { name: "保存连接", exact: true })
      .scrollIntoViewIfNeeded();
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "model-actions",
      info,
    );
    if (
      await page
        .getByRole("group", { name: "接入方式", exact: true })
        .isHidden()
    )
      await page
        .getByRole("button", { name: "返回接入方式", exact: true })
        .click();
    await page.getByRole("button", { name: "CLI 账号", exact: true }).click();
    await page.getByRole("button", { name: "Gemini CLI", exact: true }).click();
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "google-cli",
      info,
    );
    await page
      .getByRole("button", { name: "CodeBuddy CLI", exact: true })
      .click();
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "codebuddy-cli",
      info,
    );
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    if (width < 768) {
      await page
        .getByRole("button", { name: "应用功能菜单", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "资产管理", exact: true })
        .click();
    } else {
      await page.getByRole("button", { name: "文件", exact: true }).click();
      await page
        .locator(".menu-popover")
        .getByRole("button", { name: "资产管理", exact: true })
        .click();
    }
    await inspectPage(
      page,
      page.locator(".asset-panel"),
      "asset-library",
      info,
    );
    await page.getByRole("tab", { name: "资产", exact: true }).click();
    await inspectPage(
      page,
      page.locator(".asset-panel"),
      "asset-actions",
      info,
    );
  });

  test(`阶段计划工作台遵循现行 UI 规则 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const project = stageProject();
    const failed = createTask(project);
    failed.status = "failed";
    failed.outputs = failed.outputs.map((output) => ({
      ...output,
      status: "failed",
      error: "UI 验收：供应商尚未返回可归档结果。",
    }));
    project.tasks = [failed];
    await page.goto("/");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: CREATION_STORAGE_KEY,
      value: JSON.stringify(
        serializeCreationSnapshot({
          ...emptySnapshot(),
          version: 3,
          revision: Date.now(),
          activeProjectId: project.id,
          projects: [projectChatView(project)],
        }),
      ),
    });
    await page.reload();
    if (width >= 768) await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: project.name })
      .click();
    await page.getByRole("button", { name: "打开任务列表" }).click();
    await page.getByRole("button", { name: "打开任务工作台" }).click();
    for (const tab of [
      "Queue",
      "Prompt",
      "Generate",
      "Review",
      "Export",
      "Plan",
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await inspectPage(
        page,
        page.getByTestId("task-workbench"),
        `workbench-${tab.toLowerCase()}`,
        info,
      );
    }
  });
}
