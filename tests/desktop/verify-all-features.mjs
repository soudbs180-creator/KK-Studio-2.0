import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidenceDir = path.join(root, "test-results/desktop/verification");
const dataRoot = path.join(evidenceDir, "isolated-data");
const profileDir = path.join(evidenceDir, "webview-profile");
const port = 9377;
const cdpUrl = `http://127.0.0.1:${port}`;

await fs.rm(dataRoot, { recursive: true, force: true });
await fs.rm(profileDir, { recursive: true, force: true });
await fs.mkdir(dataRoot, { recursive: true });
await fs.mkdir(profileDir, { recursive: true });
await fs.mkdir(evidenceDir, { recursive: true });

async function isCdpReady() {
  try {
    const res = await fetch(`${cdpUrl}/json/version`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const report = {
  startedAt: new Date().toISOString(),
  checks: [],
  screenshots: [],
  errors: [],
  passed: false,
};

let appProcess;
let browser;
let page;

try {
  console.log("1. 正在启动原生 KK Studio Release 客户端...");
  appProcess = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: false,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profileDir,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
    },
  });

  // Wait for CDP
  for (let i = 0; i < 50; i++) {
    if (await isCdpReady()) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(await isCdpReady(), "原生 WebView2 CDP 端口未在预期时间内就绪");

  console.log("2. 连接 CDP 会话...");
  browser = await chromium.connectOverCDP(cdpUrl);
  page = browser.contexts().flatMap((c) => c.pages())[0];
  assert(page, "无法获取原生客户端 WebView Page 对象");

  page.on("pageerror", (err) => {
    console.error("WebView Page Error:", err.message);
    report.errors.push(err.message);
  });

  await page.waitForURL("http://tauri.localhost/");
  await page.waitForLoadState("domcontentloaded");
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. TopBar 文件菜单检验
  console.log("3. 检验 TopBar 文件菜单...");
  const nav = page.locator("nav[aria-label='应用菜单']");
  const fileMenuBtn = nav.getByRole("button", { name: "文件", exact: true });
  await fileMenuBtn.click();
  const filePopover = page.locator(".top-menu .menu-popover");
  await expect(filePopover).toBeVisible();

  const fileItems = await filePopover.locator("button").allInnerTexts();
  console.log("文件菜单项:", fileItems);
  assert(fileItems.includes("新建窗口"), "缺少「新建窗口」菜单项");
  assert(fileItems.includes("新建聊天"), "缺少「新建聊天」菜单项");
  assert(fileItems.includes("新建临时聊天"), "缺少「新建临时聊天」菜单项");
  assert(fileItems.includes("项目库"), "缺少「项目库」菜单项");
  assert(fileItems.includes("资产管理"), "缺少「资产管理」菜单项");
  assert(fileItems.includes("提示词库"), "缺少「提示词库」菜单项");

  const fileShot = path.join(evidenceDir, "topbar-file-menu.png");
  await page.screenshot({ path: fileShot });
  report.screenshots.push("topbar-file-menu.png");
  report.checks.push({ fileMenu: fileItems });

  // 2. TopBar 编辑菜单检验
  console.log("4. 检验 TopBar 编辑菜单...");
  const editMenuBtn = nav.getByRole("button", { name: "编辑", exact: true });
  await editMenuBtn.click();
  const editPopover = page.locator(".top-menu .menu-popover");
  await expect(editPopover).toBeVisible();

  const editItems = await editPopover.locator("button").allInnerTexts();
  console.log("编辑菜单项:", editItems);
  assert(editItems.includes("撤销"), "缺少「撤销」菜单项");
  assert(editItems.includes("重做"), "缺少「重做」菜单项");
  assert(editItems.includes("剪切"), "缺少「剪切」菜单项");
  assert(editItems.includes("复制"), "缺少「复制」菜单项");
  assert(editItems.includes("粘贴"), "缺少「粘贴」菜单项");
  assert(editItems.includes("全选"), "缺少「全选」菜单项");
  assert(editItems.includes("设置"), "缺少「设置」菜单项");

  const editShot = path.join(evidenceDir, "topbar-edit-menu.png");
  await page.screenshot({ path: editShot });
  report.screenshots.push("topbar-edit-menu.png");
  report.checks.push({ editMenu: editItems });

  // 3. 进入设置，验证画布历史步数 (5~100，默认 20)
  console.log("5. 检验设置项中的画布历史步数...");
  await editPopover.getByRole("button", { name: "设置", exact: true }).click();
  const settingsModal = page.locator(".settings-panel");
  await expect(settingsModal).toBeVisible();

  const historyInput = settingsModal.locator("#historyLimit");
  await expect(historyInput).toBeVisible();
  const defaultLimit = await historyInput.inputValue();
  console.log("默认画布历史步数:", defaultLimit);
  assert.equal(defaultLimit, "20", "默认画布历史步数必须为 20");

  // 修改步数并检查保存
  await historyInput.fill("45");
  await historyInput.dispatchEvent("change");
  const updatedLimit = await historyInput.inputValue();
  assert.equal(updatedLimit, "45", "画布历史步数应已成功更新为 45");

  const settingsShot = path.join(evidenceDir, "general-settings-history.png");
  await page.screenshot({ path: settingsShot });
  report.screenshots.push("general-settings-history.png");
  report.checks.push({
    historyLimitDefault: defaultLimit,
    historyLimitUpdated: updatedLimit,
  });

  // 关闭设置
  await settingsModal
    .getByRole("button", { name: "关闭设置", exact: true })
    .click();
  await expect(settingsModal).toHaveCount(0);

  // 4. 打开资产管理，检验垃圾箱视图
  console.log("6. 检验资产管理中的垃圾箱视图...");
  await fileMenuBtn.click();
  await page
    .locator(".top-menu .menu-popover")
    .getByRole("button", { name: "资产管理", exact: true })
    .click();
  const assetPanel = page.locator("[data-testid='asset-panel']");
  await expect(assetPanel).toBeVisible();

  const tabs = await assetPanel
    .locator(".asset-tabs button")
    .evaluateAll((btns) =>
      btns.map((b) => b.getAttribute("aria-label") || b.innerText.trim()),
    );
  console.log("资产管理 Tabs:", tabs);
  assert(tabs.includes("画布"), "缺少「画布」Tab");
  assert(tabs.includes("资产"), "缺少「资产」Tab");
  assert(tabs.includes("垃圾箱"), "缺少「垃圾箱」Tab");

  // 切换至垃圾箱 Tab
  await assetPanel.locator(".asset-tabs .asset-tab-trash").click();
  const emptyTrashTitle = await assetPanel
    .locator(".asset-empty h3")
    .innerText();
  const emptyTrashDesc = await assetPanel.locator(".asset-empty p").innerText();
  console.log("垃圾箱状态:", emptyTrashTitle, "-", emptyTrashDesc);
  assert.equal(emptyTrashTitle, "垃圾箱为空");

  const assetTrashShot = path.join(evidenceDir, "asset-panel-trash.png");
  await page.screenshot({ path: assetTrashShot });
  report.screenshots.push("asset-panel-trash.png");
  report.checks.push({ assetTabs: tabs, emptyTrashTitle, emptyTrashDesc });

  // 关闭资产管理
  await assetPanel.getByRole("button", { name: "关闭资产管理" }).click();
  await expect(assetPanel).toHaveCount(0);

  // 5. 检验新建聊天与临时聊天 (Multi-Chat & Temporary Chat)
  console.log("7. 检验多会话与临时会话切换...");
  await fileMenuBtn.click();
  await page
    .locator(".top-menu .menu-popover")
    .getByRole("button", { name: "新建聊天", exact: true })
    .click();

  // 对话面板展开
  const convPanel = page.locator(".conversation-panel");
  await expect(convPanel).toBeVisible();

  // 验证 ConversationChatTabs
  const chatTabs = page.locator(".conversation-chat-tabs button");
  const tabCountBefore = await chatTabs.count();
  console.log("初始会话 Tab 数量:", tabCountBefore);
  assert(tabCountBefore >= 1, "会话 Tab 列表应展示");

  // 再点击 TopBar 的新建临时聊天
  await fileMenuBtn.click();
  await page
    .locator(".top-menu .menu-popover")
    .getByRole("button", { name: "新建临时聊天", exact: true })
    .click();

  const tempTab = page.locator(".conversation-chat-tab.active");
  const tempName = await tempTab.innerText();
  console.log("当前活跃会话 Tab 名称:", tempName);
  assert(tempName.includes("临时"), "新建临时聊天应激活带有「临时」标记的会话");

  const tabsBoxes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".conversation-chat-tab")).map(
      (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          text: el.innerText,
          parent: el.parentElement.tagName + "." + el.parentElement.className,
          outerHTML: el.outerHTML,
          x: rect.x,
          y: rect.y,
          w: rect.width,
          h: rect.height,
          color: style.color,
          bg: style.backgroundColor,
          display: style.display,
          visible: rect.width > 0 && rect.height > 0,
        };
      },
    );
  });
  console.log("Tabs Boxes:", JSON.stringify(tabsBoxes, null, 2));

  // 验证按钮绝对不重叠 (Close 按钮与新建 Tab 按钮)
  const closeBtn = page.locator(".conversation-header-close-btn");
  const addTabBtn = page.locator(".conversation-chat-tab-add");
  const closeBox = await closeBtn.boundingBox();
  const addBox = await addTabBtn.boundingBox();
  console.log("Close Box:", closeBox, "Add Tab Box:", addBox);
  if (closeBox && addBox) {
    const isOverlapping = !(
      closeBox.x + closeBox.width <= addBox.x ||
      addBox.x + addBox.width <= closeBox.x ||
      closeBox.y + closeBox.height <= addBox.y ||
      addBox.y + addBox.height <= closeBox.y
    );
    assert(!isOverlapping, "对话头部关闭按钮与新建 Tab 按钮发生重叠！");
  }

  // 验证输入栏操作按钮与询问模式位置及状态
  const modeMenu = convPanel.locator(".chat-mode-menu");
  const sendButton = convPanel.locator(".agent-action-button");
  const modeBox = await modeMenu.boundingBox();
  const sendBox = await sendButton.boundingBox();
  console.log("Mode Box:", modeBox, "Send Box:", sendBox);
  assert(sendBox, "必须存在圆形操作按钮");
  assert(modeBox, "必须存在模式选择菜单");
  assert(
    modeBox.x < sendBox.x,
    "询问模式菜单必须在发送按钮左侧，发送按钮位于最右侧",
  );
  const sendState = await sendButton.getAttribute("data-state");
  assert.equal(
    sendState,
    "idle",
    "空闲状态下主操作按钮必须为 idle（发送状态，非暂停图标）",
  );

  // 验证 Canvas HUD 布局：最右侧为「画布 - 浏览器」切换开关，左侧无项目名
  const viewToggle = page.locator(".canvas-view-mode-toggle");
  await expect(viewToggle).toBeVisible();
  const viewBtns = await viewToggle.locator("button").allInnerTexts();
  assert(
    viewBtns.includes("画布") && viewBtns.includes("浏览器"),
    "HUD 右侧必须包含「画布 - 浏览器」视图切换开关",
  );

  const hudStatus = page.locator(".project-task-status");
  const statusText = await hudStatus.innerText();
  console.log("HUD Status Text:", statusText);
  assert(
    !statusText.includes("新建项目"),
    "状态栏不应包含「新建项目」名称，仅展示状态",
  );

  const multiChatShot = path.join(evidenceDir, "multi-chat-tabs.png");
  await page.screenshot({ path: multiChatShot });
  report.screenshots.push("multi-chat-tabs.png");
  report.checks.push({
    tempChatCreated: true,
    tempTabName: tempName,
    sendButtonState: sendState,
    buttonOverlapResolved: true,
    viewModeTogglePresent: true,
  });

  console.log("8. 全部功能真机检验完毕，结果完全符合规范！");
  report.passed = true;
} catch (err) {
  console.error("Desktop 验收失败:", err);
  report.errors.push(err instanceof Error ? err.stack : String(err));
} finally {
  report.endedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(evidenceDir, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  if (page) {
    try {
      await page.evaluate(() =>
        window.__TAURI_INTERNALS__?.invoke("plugin:window|close", {
          label: "main",
        }),
      );
    } catch (_error) {
      // Best-effort window close during teardown
    }
  }
  await browser?.close();
  if (appProcess && appProcess.exitCode === null) {
    appProcess.kill();
  }
}

assert(
  report.passed,
  `Desktop 验证未全部通过: ${JSON.stringify(report.errors)}`,
);
console.log(
  JSON.stringify({
    passed: true,
    report: path.join(evidenceDir, "report.json"),
  }),
);
