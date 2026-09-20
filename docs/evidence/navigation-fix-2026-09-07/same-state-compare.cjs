/* 导航同状态比对：Edge 200% 缩放 + 菜单展开 状态 vs Figma 节点 100:16335。
 * 设计坐标来源 docs/reference/navigation-fix-2026-09-07/100-16335-context.txt
 * 用法: node same-state-compare.cjs   （需先 npm run build && npm run preview -- --port 1422）
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

// Figma 100:16335 设计坐标（1920 主画板内绝对位置）
const DESIGN = {
  trigger: { x: 1158, y: 84, w: 63, h: 26 },
  tools: { x: 1223, y: 84, w: 164, h: 26 },
  menu: { x: 1158, y: 112, w: 97, h: 140 },
  group: { x: 1158, y: 84, w: 229, h: 26 },
  menuItems: ["缩小", "放大", "适应视图", "50%", "100%", "200%", "300%", "400%"],
  shortcuts: ["Ctrl−", "Ctrl+", "Shift1", null, null, null, null, null],
};

function diff(label, got, want, tol = 2) {
  const dx = Math.abs(got.x - want.x);
  const dy = Math.abs(got.y - want.y);
  const dw = Math.abs(got.width - want.w);
  const dh = Math.abs(got.height - want.h);
  const ok = dx <= tol && dy <= tol && dw <= tol && dh <= tol;
  return { label, got, want, ok, dx, dy, dw, dh };
}

(async () => {
  const output = __dirname;
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://127.0.0.1:1422");
  const trigger = page.getByRole("button", { name: "画布缩放", exact: true });
  await trigger.click();
  await page.getByRole("menuitemradio", { name: "200%", exact: true }).click();
  await expectTrigger(page, trigger, "200%");
  await trigger.click(); // 菜单展开（200% 状态）
  const menu = page.getByRole("menu", { name: "画布缩放比例" });
  await menu.waitFor({ state: "visible" });

  const box = (locator) => locator.boundingBox();
  const nav = await box(page.getByRole("group", { name: "画布导航" }));
  const triggerBox = await box(trigger);
  const toolsBox = await box(page.locator(".canvas-navigation-tools"));
  const menuBox = await box(menu);
  const chat = await box(page.locator(".conversation-panel"));
  const toolbar = await box(page.getByRole("toolbar", { name: "画布工具" }));

  // 菜单项顺序与快捷键（menuitem 按钮 + menuitemradio 比例项 + 分隔线）
  const itemRows = await menu.locator("button").evaluateAll((btns) =>
    btns.map((b) => ({
      role: b.getAttribute("role"),
      text: (b.textContent || "").replace(/\s+/g, " ").trim(),
      disabled: b.hasAttribute("disabled"),
      checked: b.getAttribute("aria-checked"),
    })),
  );
  const dividers = await menu.locator('[role="separator"]').count();
  const dividerBoxes = [];
  for (let i = 0; i < dividers; i += 1) {
    dividerBoxes.push(await box(menu.locator('[role="separator"]').nth(i)));
  }

  const rows = [
    diff("导航组", nav, DESIGN.group),
    diff("缩放按钮", triggerBox, DESIGN.trigger),
    diff("功能组", toolsBox, DESIGN.tools),
    diff("缩放菜单", menuBox, DESIGN.menu),
  ];
  const chatGap = chat ? chat.x - (nav.x + nav.width) : null;

  await page.screenshot({
    path: path.join(output, "same-state-nav-200.png"),
    clip: { x: nav.x, y: nav.y, width: 229, height: 168 },
    animations: "disabled",
  });
  await page.screenshot({
    path: path.join(output, "same-state-full-1920.png"),
    animations: "disabled",
  });

  const result = {
    state: "zoom menu open at 200% (matches Figma node 100:16335)",
    design: DESIGN,
    measured: { nav, triggerBox, toolsBox, menuBox, chat, toolbar, chatGap },
    diffs: rows.map((r) => ({ label: r.label, ok: r.ok, dx: r.dx, dy: r.dy, dw: r.dw, dh: r.dh })),
    menuItemRows: itemRows,
    dividerCount: dividers,
    dividerBoxes,
    errors,
    screenshots: ["same-state-nav-200.png", "same-state-full-1920.png"],
    compare: {
      menuOrderOk:
        JSON.stringify(itemRows.map((r) => r.text)) ===
        JSON.stringify(DESIGN.menuItems.map((t, i) => t + (DESIGN.shortcuts[i] || ""))),
      checkedItem: itemRows.find((r) => r.checked === "true")?.text || null,
      chatGapPx: chatGap,
    },
  };
  fs.writeFileSync(path.join(output, "same-state-compare.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await context.close();
  await browser.close();
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

async function expectTrigger(page, trigger, text) {
  const label = trigger.locator("span");
  const current = (await label.textContent()) || "";
  if (current !== text) {
    throw new Error(`expected trigger ${text}, got ${current}`);
  }
}
