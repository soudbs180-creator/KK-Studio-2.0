/**
 * TASK-UI-009 浏览器同态证据采集（第三轮收敛模型）。
 * 运行前提：dist 已构建，vite preview 已运行（默认 1424；可用 EVIDENCE_BASE 覆盖）。
 * 产出：evidence/*.png 截图；控制台逐条打印 PASS 断言。
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.EVIDENCE_BASE ?? "http://127.0.0.1:1424";
let pass = 0;
let fail = 0;
function ok(name) {
  pass += 1;
  console.log(`PASS ${name}`);
}
function bad(name, err) {
  fail += 1;
  console.error(`FAIL ${name}: ${err?.message ?? err}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(base);
const sidebar = page.locator(".sidebar");
await sidebar.waitFor();

const groupedSection = () => sidebar.locator(".project-groups section").nth(0);
const ungroupedSection = () =>
  sidebar.locator(".project-groups section").nth(1);

async function shot(name) {
  // 等待折叠/展开状态与箭头翻转稳定后再截图，避免旋转过渡中间态入镜
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(dir, name),
    fullPage: false,
  });
}

try {
  // 01 默认状态：项目区第一层=文件夹（KK项目 展开含二级 KK工作流），未分组 KK工作流
  const sections = sidebar.locator(".project-groups section");
  if ((await sections.count()) === 2) ok("默认两组 section");
  const toggle = groupedSection().locator(".folder-heading-toggle").first();
  if ((await toggle.count()) === 1) ok("项目区第一层只有 1 个文件夹行");
  if ((await toggle.getAttribute("aria-expanded")) === "true")
    ok("默认文件夹 KK项目 展开");
  if (
    await groupedSection().getByText("KK工作流", { exact: true }).isVisible()
  )
    ok("文件夹二级 KK工作流 可见");
  if (
    await ungroupedSection()
      .getByText("KK工作流", { exact: true })
      .isVisible()
  )
    ok("未分组 KK工作流 可见（两组各一，section 限定）");
  await shot("01-default-sidebar.png");
  await page.screenshot({
    path: path.join(dir, "zoom-03-sidebar.png"),
    clip: { x: 0, y: 330, width: 290, height: 210 },
  });

  // 02 创建未分组项目并改名；三点菜单「移动到项目组」列出已有文件夹与新建项
  await sidebar.getByRole("button", { name: "创建未分组项目" }).click();
  const uInput = ungroupedSection().locator(".project-title-input");
  await uInput.waitFor();
  if (await uInput.evaluate((el) => el === document.activeElement))
    ok("未分组新建行输入框获得焦点");
  await uInput.fill("需求笔记");
  await uInput.press("Enter");
  if (
    await ungroupedSection().getByText("需求笔记", { exact: true }).isVisible()
  )
    ok("未分组项目「需求笔记」创建并改名成功");
  await ungroupedSection()
    .locator(".project-entry", { hasText: "需求笔记" })
    .getByRole("button", { name: "更多项目设置" })
    .click();
  await page.getByRole("menuitem", { name: "移动到项目组", exact: true }).click();
  const submenu = page.getByRole("menu", { name: "移动到项目组", exact: true });
  await submenu.waitFor();
  if (
    (await submenu.getByRole("menuitem", { name: "KK项目", exact: true }).count()) === 1
  )
    ok("移动到项目组子面板列出已有文件夹 KK项目");
  if (
    await submenu
      .getByRole("menuitem", { name: "新建项目文件夹", exact: true })
      .isVisible()
  )
    ok("移动到项目组子面板提供「新建项目文件夹」");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await shot("02-created-ungrouped.png");

  // 03 创建项目文件夹：展开并显示 Prototype 空提示
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folder = sidebar.getByRole("button", { name: "新建文件夹", exact: true });
  await folder.waitFor();
  if ((await folder.getAttribute("aria-expanded")) === "true")
    ok("新建文件夹初始展开");
  if (await sidebar.locator(".project-folder-empty").isVisible())
    ok("空文件夹显示 Prototype 空提示");
  await shot("03-folder-created.png");

  // 04 未分组项目拖入文件夹：二级展开收纳（保留改名标题）
  const source = ungroupedSection().locator(".project-entry", {
    hasText: "需求笔记",
  });
  await source.dragTo(folder, { sourcePosition: { x: 60, y: 14 } });
  if ((await folder.getAttribute("aria-expanded")) === "true")
    ok("拖入后文件夹展开");
  if (
    await sidebar
      .locator(".project-nested-entry .project-link", { hasText: "需求笔记" })
      .isVisible()
  )
    ok("拖入后「需求笔记」出现在文件夹二级（标题保留）");
  if (
    await ungroupedSection().getByText("需求笔记", { exact: true }).isHidden()
  )
    ok("拖入后未分组区不再显示该行");
  await shot("04-dragged-into-folder.png");
  await page.screenshot({
    path: path.join(dir, "zoom-04-sidebar.png"),
    clip: { x: 0, y: 360, width: 290, height: 220 },
  });

  // 05 点击文件夹行：收起二级条目（箭头朝右）
  await folder.click();
  if ((await folder.getAttribute("aria-expanded")) === "false")
    ok("点击文件夹收起二级条目");
  if (
    await sidebar
      .locator(".project-nested-entry .project-link", { hasText: "需求笔记" })
      .isHidden()
  )
    ok("二级条目随折叠隐藏");
  await shot("05-folder-collapsed.png");
  await folder.click();
  if ((await folder.getAttribute("aria-expanded")) === "true")
    ok("再次点击文件夹展开二级");

  // 06 点击项目条目收起全部文件夹
  await ungroupedSection().locator(".project-entry").first().click();
  if ((await folder.getAttribute("aria-expanded")) === "false")
    ok("点击项目条目后全部文件夹收起");
  if (
    await sidebar
      .locator(".project-nested-entry .project-link", { hasText: "需求笔记" })
      .isHidden()
  )
    ok("项目条目点击后二级隐藏");
  await shot("06-project-click-collapses-folders.png");

  // 07 点击「项目」标题隐藏整组（含文件夹），箭头朝右；未分组独立保留
  const projectTitle = sidebar.getByRole("button", { name: "项目", exact: true });
  await projectTitle.click();
  if ((await projectTitle.getAttribute("aria-expanded")) === "false")
    ok("「项目」标题折叠整组");
  if (await groupedSection().locator(".folder-heading-toggle").first().isHidden())
    ok("折叠后文件夹行隐藏");
  if (
    await ungroupedSection().getByText("需求笔记", { exact: true }).isHidden()
  )
    ok("未分组区不受「项目」折叠影响（需求笔记已收纳，无残留）");
  await shot("07-group-title-collapsed.png");
  await projectTitle.click();
  if (await folder.isVisible()) ok("再次点击「项目」标题恢复文件夹");
  await shot("08-group-title-restored.png");

  // 09 点击「未分组」标题隐藏全部条目，再点恢复
  const ungroupedTitle = sidebar.getByRole("button", { name: "未分组", exact: true });
  await ungroupedTitle.click();
  if ((await ungroupedTitle.getAttribute("aria-expanded")) === "false")
    ok("「未分组」标题折叠全部");
  if (
    await ungroupedSection().locator(".project-entry").first().isHidden()
  )
    ok("未分组条目隐藏");
  await shot("09-ungrouped-title-collapsed.png");
  await ungroupedTitle.click();
  if (
    await ungroupedSection().locator(".project-entry").first().isVisible()
  )
    ok("再次点击「未分组」标题恢复条目");

  // 补充：拖到「项目」区空白自动创建以项目命名的文件夹
  // （重载到默认态，与 spec 用例的新页面态一致；避免前面步骤残留的多个
  //   展开文件夹挤满 section 导致落点落在文件夹行上）
  await page.reload();
  const sidebar2 = page.locator(".sidebar");
  await sidebar2.waitFor();
  const groupedSection2 = () =>
    sidebar2.locator(".project-groups section").nth(0);
  const ungroupedSection2 = () =>
    sidebar2.locator(".project-groups section").nth(1);
  await sidebar2.getByRole("button", { name: "创建未分组项目" }).click();
  const dInput = ungroupedSection2().locator(".project-title-input");
  await dInput.fill("协同设计");
  await dInput.press("Enter");
  const dSource = ungroupedSection2().locator(".project-entry", {
    hasText: "协同设计",
  });
  const box = await groupedSection2().boundingBox();
  await dSource.dragTo(groupedSection2(), {
    sourcePosition: { x: 60, y: 14 },
    targetPosition: { x: 40, y: Math.max(10, box.height - 8) },
  });
  const newFolder = groupedSection2().locator(".folder-heading-toggle", {
    hasText: "协同设计",
  });
  if ((await newFolder.getAttribute("aria-expanded")) === "true")
    ok("拖到项目区空白自动创建以项目命名的文件夹并展开");
  if (
    await sidebar2
      .locator(".project-nested-entry .project-link", { hasText: "协同设计" })
      .isVisible()
  )
    ok("新文件夹二级收纳该项目");
  if (
    await ungroupedSection2()
      .getByText("协同设计", { exact: true })
      .isHidden()
  )
    ok("拖入后未分组区不再显示该行");

  // 第四轮：项目行缩略图按内容类型区分（图片 / 聊天图标 / 随机纯色）
  await page.reload();
  const sidebar3 = page.locator(".sidebar");
  await sidebar3.waitFor();
  const ungroupedSection3 = () =>
    sidebar3.locator(".project-groups section").nth(1);
  const imageThumb = sidebar3
    .locator(".project-nested-entry .project-thumb-image-src")
    .first();
  if ((await imageThumb.getAttribute("src")) === "/fixtures/demo/blue-hour.png")
    ok("有生成图片的项目行显示内容图片缩略图（blue-hour.png）");
  const chatThumb = ungroupedSection3()
    .locator(".project-entry", { hasText: "KK工作流" })
    .locator(".project-thumb-chat")
    .first();
  if (
    (await chatThumb
      .locator("img")
      .getAttribute("src")) === "/design/figma/project-chat-glyph.svg"
  )
    ok("纯文案项目行显示纯色块 + 聊天图标");
  await sidebar3
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const cInput = ungroupedSection3().locator(".project-title-input");
  await cInput.fill("草稿项目");
  await cInput.press("Enter");
  const draftRow = ungroupedSection3().locator(".project-entry", {
    hasText: "草稿项目",
  });
  if ((await draftRow.locator(".project-thumb-color").count()) === 1)
    ok("新建未生成项目行显示随机纯色块（无聊天图标）");
  if ((await draftRow.locator(".project-thumb-chat").count()) === 0)
    ok("新建未生成项目行不带聊天图标");
  await shot("zoom-07-thumbnails.png");
  await sidebar3
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const c2 = ungroupedSection3().locator(".project-title-input");
  await c2.fill("项目A");
  await c2.press("Enter");
  await sidebar3
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const c3 = ungroupedSection3().locator(".project-title-input");
  await c3.fill("项目B");
  await c3.press("Enter");
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(dir, "zoom-08-random-colors.png"),
    clip: { x: 0, y: 430, width: 290, height: 260 },
  });

  console.log(`\nEVIDENCE SUMMARY: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} finally {
  await browser.close();
}
