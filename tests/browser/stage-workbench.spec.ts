import { expect, test, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
} from "../../src/features/creation/model";
import { stageProject } from "../fixtures/stage-project";
import { expandSidebar } from "./helpers";

async function openPlans(page: Page, empty = false) {
  const project = stageProject(empty);
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: CREATION_STORAGE_KEY,
    value: JSON.stringify({
      ...emptySnapshot(),
      revision: Date.now(),
      activeProjectId: project.id,
      projects: [project],
    }),
  });
  await page.reload();
  if ((page.viewportSize()?.width ?? 1920) >= 768) await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: project.name })
    .click();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
  await page.getByRole("tab", { name: /^阶段计划/ }).click();
}

async function savedPlan(page: Page) {
  return page.evaluate((key) => {
    const snapshot = JSON.parse(localStorage.getItem(key) ?? "{}");
    return snapshot.projects?.[0]?.stagePlans?.[0];
  }, CREATION_STORAGE_KEY);
}

test("计划批准只推进一次并持久化，不创建生成任务", async ({ page }) => {
  await openPlans(page);
  await expect(page.getByRole("region", { name: "阶段计划" })).toContainText(
    "等待计划审批",
  );
  await expect(page.getByText("编写产品分镜", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "批准计划", exact: true }).dblclick();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[0].status)
    .toBe("doing");
  expect((await savedPlan(page)).revision).toBe(1);
  await expect(page.locator(".task-queue-item")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "阶段计划" })).toContainText(
    "自动执行尚未接入",
  );
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "阶段审批项目" })
    .click();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
  await page.getByRole("tab", { name: /^阶段计划/ }).click();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[0].status)
    .toBe("doing");
});

test("计划拒绝和解除阻断沿用原计划，仍须再次审批", async ({ page }) => {
  await openPlans(page);
  await page.getByRole("button", { name: "拒绝计划", exact: true }).click();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[0].status)
    .toBe("blocked");
  await page.getByRole("button", { name: "解除阻断", exact: true }).click();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[0].status)
    .toBe("doing");
  expect((await savedPlan(page)).stages[0].planApprovedAt).toBeUndefined();
  await expect(page.getByRole("region", { name: "阶段计划" })).toContainText(
    "计划审批尚未通过",
  );
});

test("结果返工保留原提示词并重置依赖结果", async ({ page }) => {
  await openPlans(page);
  await page.getByRole("button", { name: /阶段 2：画面结果/ }).click();
  await page.getByRole("button", { name: "返工结果", exact: true }).click();
  await expect(page.getByText("确认返工范围", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "确认返工", exact: true }).click();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[1].status)
    .toBe("doing");
  const plan = await savedPlan(page);
  expect(plan.stages[1].workItems[0].status).toBe("queued");
  expect(plan.stages[1].workItems[0].prompt).toBe("保留原始产品提示词");
  expect(plan.stages[2].workItems[0].status).toBe("queued");
});

test("保存失败持续显示原因，审批不宣称已保存", async ({ page }) => {
  await openPlans(page);
  await expect(page.locator(".project-save-state")).toHaveText("已保存");
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (args[1] === "readwrite")
        throw new DOMException(
          "stage fixture write failed",
          "QuotaExceededError",
        );
      return original.apply(this, args);
    };
  });
  await page.getByRole("button", { name: "批准计划", exact: true }).click();
  const panel = page.getByRole("region", { name: "阶段计划" });
  await expect(panel).toContainText("请先处理项目恢复提示");
  await expect(panel.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: /阶段 2：画面结果/ }).click();
  await expect(
    page.getByRole("button", { name: "批准结果", exact: true }),
  ).toBeDisabled();
});

test("离线审批仍在本地保存，键盘能够提交", async ({ page }) => {
  await openPlans(page);
  await page.context().setOffline(true);
  const approve = page.getByRole("button", { name: "批准计划", exact: true });
  await approve.focus();
  await approve.press("Enter");
  await expect
    .poll(async () => (await savedPlan(page))?.stages[0].status)
    .toBe("doing");
  await expect(
    page.getByRole("region", { name: "阶段计划" }).getByRole("status"),
  ).toBeVisible();
});

for (const width of [1099, 1920]) {
  test(`${width}px 阶段审批视图没有水平溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await openPlans(page);
    const panel = page.getByRole("region", { name: "阶段计划" });
    const geometry = await panel.evaluate((element) => ({
      width: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    await page.screenshot({
      path: `test-results/stage-workbench-${width}.png`,
      fullPage: true,
    });
  });
}

test("结果审批通过后显示完成进度", async ({ page }) => {
  await openPlans(page);
  await page.getByRole("button", { name: /阶段 2：画面结果/ }).click();
  await page.getByRole("button", { name: "批准结果", exact: true }).click();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[1].status)
    .toBe("done");
  await expect(page.getByRole("region", { name: "阶段计划" })).toContainText(
    "1 / 3 阶段已完成",
  );
});

test("空项目显示明确计划来源且保留单一任务队列", async ({ page }) => {
  await openPlans(page, true);
  await expect(page.getByRole("region", { name: "阶段计划" })).toContainText(
    "暂无阶段计划",
  );
  await expect(page.locator(".task-queue-item")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "批准计划", exact: true }),
  ).toHaveCount(0);
});

test("窄屏仍可查看计划与提交审批", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlans(page);
  const approve = page.getByRole("button", { name: "批准计划", exact: true });
  await approve.scrollIntoViewIfNeeded();
  await expect(approve).toBeVisible();
  await approve.click();
  await expect
    .poll(async () => (await savedPlan(page))?.stages[0].status)
    .toBe("doing");
  await page.screenshot({
    path: "test-results/stage-workbench-390.png",
    fullPage: true,
  });
});
