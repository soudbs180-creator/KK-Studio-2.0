import { expect, test, type Page } from "@playwright/test";
import { openSeededProject, expandSidebar } from "./helpers";
import { SKILL_RECORDS_STORAGE_KEY } from "../../src/features/skills/skillRegistry";
import { CREATION_STORAGE_KEY } from "../../src/features/creation/model";

async function openAssistants(page: Page) {
  await openSeededProject(page);
  const panel = page.locator(".conversation-panel");
  await expect(panel.getByLabel("对话助手", { exact: true })).toBeVisible();
  return panel;
}

async function reopenProject(page: Page) {
  await page.reload();
  await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  return page.locator(".conversation-panel");
}

test("curated programming/image/video assistants are selectable and bundled prompts are read-only", async ({
  page,
}) => {
  const panel = await openAssistants(page);
  const picker = panel.getByLabel("对话助手", { exact: true });
  for (const name of [
    "代码实现助手",
    "代码审查助手",
    "图片创意助手",
    "图片编辑助手",
    "视频分镜助手",
  ])
    await expect(
      picker.getByRole("option", { name, exact: true }),
    ).toBeAttached();
  await picker.selectOption("assistant-code-reviewer");
  await panel.getByRole("button", { name: "查看助手", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "查看内置助手" });
  await expect(dialog.getByLabel("助手名称")).toHaveValue("代码审查助手");
  await expect(dialog.getByLabel("助手名称")).toHaveAttribute("readonly", "");
  await expect(dialog.getByLabel("助手指令")).toHaveAttribute("readonly", "");
  await expect(dialog.getByRole("button", { name: "保存助手" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "查看助手", exact: true }),
  ).toBeFocused();
});

test("a custom assistant is selected only after save and survives project/registry reload and edit", async ({
  page,
}) => {
  const panel = await openAssistants(page);
  await panel.getByRole("button", { name: "新建助手", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "新建自定义助手" });
  await dialog.getByLabel("助手名称").fill("中文代码复核 🌏");
  await dialog.getByLabel("助手分类").selectOption("编程");
  await dialog.getByLabel("助手指令").fill("保留原件，核对异步取消与恢复。");
  await dialog.getByRole("button", { name: "保存助手", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const picker = panel.getByLabel("对话助手", { exact: true });
  const id = await picker.inputValue();
  expect(id).toMatch(/^assistant-/);
  await expect(
    picker.getByRole("option", { name: "中文代码复核 🌏", exact: true }),
  ).toBeAttached();
  await expect
    .poll(() =>
      page.evaluate(({ key, id }) => localStorage.getItem(key)?.includes(id), {
        key: CREATION_STORAGE_KEY,
        id,
      }),
    )
    .toBe(true);
  const reopened = await reopenProject(page);
  await expect(reopened.getByLabel("对话助手", { exact: true })).toHaveValue(
    id,
  );
  await reopened.getByRole("button", { name: "编辑助手", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "编辑自定义助手" });
  await expect(dialog.getByLabel("助手指令")).toHaveValue(
    "保留原件，核对异步取消与恢复。",
  );
  await dialog.getByLabel("助手名称").fill("更新后的复核助手");
  await dialog.getByLabel("助手指令").fill("核对真实回执和迟到响应。");
  await dialog.getByRole("button", { name: "保存助手", exact: true }).click();
  await expect(reopened.getByLabel("对话助手", { exact: true })).toHaveValue(
    id,
  );
  const record = await page.evaluate(
    ({ key, id }) => {
      const saved = JSON.parse(localStorage.getItem(key)!);
      return saved.records.find(
        (entry: { manifest: { id: string } }) => entry.manifest.id === id,
      );
    },
    { key: SKILL_RECORDS_STORAGE_KEY, id },
  );
  expect(record.instructions).toBe("核对真实回执和迟到响应。");
  expect(record.manifest.permissions).toEqual([]);
  expect(record.manifest.source).toBe("local");
});

test("disabled and uninstalled assistants remain visible with a reason and cannot be selected", async ({
  page,
}) => {
  await openAssistants(page);
  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    for (const record of saved.records) {
      if (record.manifest.id === "assistant-code-builder")
        record.enabled = false;
      if (record.manifest.id === "assistant-image-prompt") {
        record.installed = false;
        record.enabled = false;
      }
    }
    localStorage.setItem(key, JSON.stringify(saved));
  }, SKILL_RECORDS_STORAGE_KEY);
  const panel = await reopenProject(page);
  const picker = panel.getByLabel("对话助手", { exact: true });
  await expect(
    picker.getByRole("option", { name: "代码实现助手（已禁用）", exact: true }),
  ).toHaveJSProperty("disabled", true);
  await expect(
    picker.getByRole("option", { name: "图片创意助手（未安装）", exact: true }),
  ).toHaveJSProperty("disabled", true);
  await expect(picker).toBeEnabled();
  await picker.selectOption("assistant-code-reviewer");
  for (const id of ["assistant-code-builder", "assistant-image-prompt"]) {
    await picker.evaluate((element, id) => {
      (element as HTMLSelectElement).value = id;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, id);
    await expect(picker).toHaveValue("assistant-code-reviewer");
    await expect(panel).toContainText("助手尚未安装或已禁用");
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const saved = JSON.parse(localStorage.getItem(key)!);
          return saved.projects.find(
            (project: { name: string }) => project.name === "Agent 验证项目",
          )?.composerDraft.assistantId;
        }, CREATION_STORAGE_KEY),
      )
      .toBe("assistant-code-reviewer");
  }
});

test("the Skills entry keeps bundled assistant editing read-only and rejects an import overwrite", async ({
  page,
}) => {
  await openAssistants(page);
  await expandSidebar(page);
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "技能", exact: true })
    .click();
  const skills = page.getByRole("region", { name: "Skill", exact: true });
  const card = skills
    .locator("article.catalog-card")
    .filter({ hasText: "代码审查助手" });
  await expect(card).toBeVisible();
  const edit = card.getByRole("button", { name: "编辑", exact: true });
  await expect(edit).toBeDisabled();
  await expect(edit).toHaveAccessibleDescription(
    "内置助手为只读，请新建自定义助手。",
  );
  await expect(
    card.getByText("内置助手为只读，请新建自定义助手。", { exact: true }),
  ).toBeVisible();
  await edit.dispatchEvent("click");
  await expect(
    page.getByRole("dialog", { name: "编辑本地 Skill", exact: true }),
  ).toHaveCount(0);
  const original = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).records.find(
        (record: { manifest: { id: string } }) =>
          record.manifest.id === "assistant-code-reviewer",
      ),
    SKILL_RECORDS_STORAGE_KEY,
  );
  await skills.locator('input[type="file"]').setInputFiles({
    name: "assistant-overwrite.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...original,
        manifest: { ...original.manifest, source: "local" },
        instructions: "通过导入覆盖内置助手",
      }),
    ),
  });
  await expect(
    skills
      .getByRole("status")
      .filter({ hasText: "内置助手为只读，请新建自定义助手。" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).records.find(
            (record: { manifest: { id: string } }) =>
              record.manifest.id === "assistant-code-reviewer",
          ),
        SKILL_RECORDS_STORAGE_KEY,
      ),
    )
    .toEqual(original);
});

test("validation/persistence failures preserve the editor and do not create a false saved selection", async ({
  page,
}) => {
  const panel = await openAssistants(page);
  const picker = panel.getByLabel("对话助手", { exact: true });
  await picker.selectOption("assistant-code-reviewer");
  await panel.getByRole("button", { name: "新建助手", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新建自定义助手" });
  await dialog.getByLabel("助手名称").fill("失败时应保留");
  await dialog.getByLabel("助手指令").fill("api_key=fixture-secret");
  await dialog.getByRole("button", { name: "保存助手", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(/密钥|凭据/);
  await expect(picker).toHaveValue("assistant-code-reviewer");
  await dialog.getByLabel("助手指令").fill("合法的助手指令。");
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException("write denied", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, SKILL_RECORDS_STORAGE_KEY);
  await dialog.getByRole("button", { name: "保存助手", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("保存失败");
  await expect(dialog.getByLabel("助手名称")).toHaveValue("失败时应保留");
  await expect(picker).toHaveValue("assistant-code-reviewer");
  await expect(
    picker.getByRole("option", { name: "失败时应保留", exact: true }),
  ).toHaveCount(0);
});
