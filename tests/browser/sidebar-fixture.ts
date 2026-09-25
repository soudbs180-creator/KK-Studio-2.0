import { expect, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  emptySnapshot,
} from "../../src/features/creation/model";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems";
import { createProjectCanvas } from "../../src/domain/projectCanvas";

/** Explicit saved project data for geometry and grouping tests. */
export async function seedSidebarFixture(page: Page, textFirst = false) {
  await page.goto("/");
  const first = createProject({
    prompt: "",
    model: textFirst ? "gpt-4o" : "kk-image-2",
    kind: textFirst ? "text" : "image",
    attachments: [],
  });
  const image = createProject({
    prompt: "",
    model: "kk-image-2",
    kind: "image",
    attachments: [],
  });
  const source = BASE_CANVAS_ITEMS.find((item) => item.kind === "image")!;
  const generated = {
    ...source,
    id: image.id + "-result",
    preview: "/fixtures/demo/blue-hour.png",
    result: {
      id: image.id + "-asset",
      kind: "image" as const,
      title: "真实结果测试图",
      description: "浏览器 fixture",
      src: "/fixtures/demo/blue-hour.png",
      source: "provider" as const,
    },
  };
  const firstItems = textFirst ? [] : BASE_CANVAS_ITEMS;
  const projects = [
    {
      ...first,
      name: textFirst ? "对话项目" : "Agent 验证项目",
      items: firstItems,
      canvas: createProjectCanvas(firstItems),
    },
    {
      ...image,
      name: "KK工作流",
      items: [generated],
      canvas: createProjectCanvas([generated]),
    },
  ];
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: CREATION_STORAGE_KEY,
    value: JSON.stringify({
      ...emptySnapshot(),
      revision: Date.now(),
      activeProjectId: first.id,
      projects,
    }),
  });
  await page.reload();
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar.locator(".project-entry")).toHaveCount(2);
  return sidebar;
}

export async function arrangeSidebarFolder(page: Page, textFirst = false) {
  const sidebar = await seedSidebarFixture(page, textFirst);
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folder = sidebar.locator(".project-folder-group").first();
  await folder.locator(".folder-heading-toggle").click({ button: "right" });
  await folder.getByRole("menuitem", { name: "改名字" }).click();
  await folder.getByRole("textbox", { name: "项目文件夹名称" }).fill("KK项目");
  await folder.getByRole("textbox", { name: "项目文件夹名称" }).press("Enter");
  await sidebar
    .locator(".project-entry")
    .filter({ hasText: "KK工作流" })
    .dragTo(folder.locator(".folder-heading-toggle"), {
      sourcePosition: { x: 60, y: 14 },
    });
  await expect(
    folder.locator(".project-nested-entry .project-entry"),
  ).toHaveCount(1);
  return sidebar;
}
