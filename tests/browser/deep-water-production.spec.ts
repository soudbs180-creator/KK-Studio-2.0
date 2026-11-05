import { test, expect } from "@playwright/test";
import {
  openWorkspace,
  selectSettingsSection,
  waitForConversationPanelSettled,
} from "./helpers";

async function configureTextModel(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await selectSettingsSection(page, "模型接入");
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await page.getByLabel("接口地址").fill("http://127.0.0.1:19436/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-step2-key");
  await page.getByLabel("模型名称").fill("gpt-storyboard-fixture");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}

test("director presets and closed-menu messages persist on the real canvas", async ({
  page,
}, testInfo) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  await node.focus();
  await page.keyboard.press("Enter");
  await node.getByRole("button", { name: "镜头与导演台", exact: true }).click();
  await node.getByRole("button", { name: "启用光学参数", exact: true }).click();
  await node
    .getByRole("button", { name: "肖像特写 85mm f/1.4", exact: true })
    .click();
  await node.getByRole("button", { name: "仰拍", exact: true }).click();
  await node.getByLabel("水平环绕角", { exact: true }).fill("");
  await node.getByLabel("水平环绕角", { exact: true }).pressSequentially("-45");
  await node.getByLabel("水平环绕角", { exact: true }).press("Tab");
  await expect(node.getByLabel("水平环绕角", { exact: true })).toHaveValue(
    "-45",
  );
  await expect(
    node.getByRole("combobox", { name: "焦段", exact: true }),
  ).toContainText("85 mm");
  await page.screenshot({ path: testInfo.outputPath("director-presets.png") });
  await node.getByRole("button", { name: "镜头与导演台", exact: true }).click();
  await page.evaluate(() =>
    window.postMessage(
      {
        type: "storyai:director-apply",
        nodeId: "image",
        optics: {
          lensMm: 24,
          aperture: "2.8",
          shotScale: "WS",
          cameraAngle: "high-angle",
          azimuthDeg: -90,
          elevationDeg: 30,
        },
      },
      location.origin,
    ),
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = JSON.parse(
          localStorage.getItem("kk-studio-next:creation:v1")!,
        );
        return s.projects
          .find((p: { id: string }) => p.id === s.activeProjectId)
          .items.find((i: { id: string }) => i.id === "image").parameters
          ?.optics?.lensMm;
      }),
    )
    .toBe(24);
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await node.focus();
  await page.keyboard.press("Enter");
  await node.getByRole("button", { name: "镜头与导演台", exact: true }).click();
  await expect(node.getByLabel("俯仰角", { exact: true })).toHaveValue("30");
});

test("bible extraction, bounded repair and single shot writeback use production text tasks", async ({
  page,
}, testInfo) => {
  const shot = {
    id: "1",
    scene: "门口",
    description: "小林穿红衣",
    dialogue: "我回来了",
    durationSeconds: 3,
    shotSize: "MS",
    cameraMovement: "固定",
    characters: ["小林"],
    props: [],
    assetIds: [],
  };
  let calls = 0;
  await page.route(
    "http://127.0.0.1:19436/v1/chat/completions",
    async (route) => {
      calls++;
      const prompt = String(route.request().postDataJSON().messages[0].content);
      const content = prompt.includes("提炼角色设定表")
        ? [
            {
              characterName: "小林",
              kind: "costume",
              requiredAttributes: ["红衣"],
            },
          ]
        : {
            title: "回家",
            shots: [
              {
                ...shot,
                id: prompt.includes('"id":"1-1"') ? "1-1" : "1",
                description:
                  calls === 2
                    ? "小林穿蓝衣"
                    : calls > 3
                      ? "小林穿红衣，缓步走进门口"
                      : shot.description,
              },
            ],
          };
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(content) } }] })}\n\ndata: [DONE]\n\n`,
      });
    },
  );
  await openWorkspace(page);
  await configureTextModel(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "漫剧分镜工作流", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "小说 / 剧本转分镜",
    exact: true,
  });
  await dialog
    .getByLabel("小说 / 剧本", { exact: true })
    .fill("小林穿红衣走进门口，说：我回来了。");
  await dialog
    .getByRole("button", { name: "从剧本提炼设定表", exact: true })
    .click();
  await expect(dialog.getByLabel("固定特征", { exact: true })).toHaveValue(
    "红衣",
  );
  await dialog.getByRole("button", { name: "生成分镜", exact: true }).click();
  await expect(dialog).toContainText("一致性检查通过");
  expect(calls).toBe(3);
  await dialog
    .getByRole("button", { name: "添加到画布 / 资产", exact: true })
    .click();
  await expect(dialog).toContainText("分镜已保存");
  await dialog
    .getByRole("button", { name: "重修本镜 1-1", exact: true })
    .click();
  await expect(dialog).toContainText("缓步走进门口");
  expect(calls).toBe(4);
  await page.screenshot({ path: testInfo.outputPath("storyboard-repair.png") });
  await dialog.getByRole("button", { name: "关闭对话框", exact: true }).click();
  await expect(
    page.locator(
      '.canvas-node[data-testid^="canvas-node-storyboard-"]:not([data-testid^="canvas-node-storyboard-source-"])',
    ),
  ).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = JSON.parse(
          localStorage.getItem("kk-studio-next:creation:v1")!,
        );
        return s.projects
          .flatMap(
            (p: { items: Array<{ id: string; prompt?: string }> }) => p.items,
          )
          .filter(
            (i: { id: string }) =>
              i.id.startsWith("storyboard-") &&
              !i.id.startsWith("storyboard-source-"),
          )
          .some((i: { prompt?: string }) => i.prompt?.includes("缓步走进门口"));
      }),
    )
    .toBe(true);
});

test("blueprint export downloads a validated editable architecture file", async ({
  page,
}, testInfo) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "架构蓝图映射", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出架构蓝图", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("architecture.json");
  await file.saveAs(testInfo.outputPath("architecture.json"));
  await expect(
    page
      .getByRole("dialog", { name: "架构蓝图映射", exact: true })
      .getByRole("status"),
  ).toContainText("已导出");
  await page.screenshot({ path: testInfo.outputPath("blueprint-export.png") });
});

test("网关使用真实账号，路由顺序和出站脱敏进入真实请求", async ({ page }) => {
  const endpoint = "http://127.0.0.1:19438/v1/chat/completions";
  let body = "";
  await page.route(endpoint, async (route) => {
    body = route.request().postData() ?? "";
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"choices":[{"delta":{"content":"已脱敏生成"}}]}\n\ndata: [DONE]\n\n',
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: "模型接入…", exact: true })
    .click();
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await page.getByLabel("接口地址").fill("http://127.0.0.1:19438/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-gateway-key");
  await page.getByLabel("模型名称").fill("gpt-gateway-test");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  const gateway = page.getByRole("region", { name: "本地网关" });
  await expect(gateway).toContainText("gpt-gateway-test");
  await expect(gateway).not.toContainText("codex-a");
  await page.evaluate(() => {
    const key = "kk-studio-next:provider-connections:v1";
    const list = JSON.parse(localStorage.getItem(key) ?? "[]");
    const first = list[0];
    first.priority = 10;
    list.push({
      ...first,
      id: "official-backup",
      displayName: "官方备用账号",
      priority: 0,
    });
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event("kk:provider-connections"));
  });
  await expect(gateway).toContainText("官方备用账号");
  await gateway.getByRole("combobox", { name: "路由策略" }).click();
  await page.getByRole("option", { name: "主备顺序", exact: true }).click();
  await expect(gateway.getByRole("heading", { name: /1\. / })).toContainText(
    "官方备用账号",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await waitForConversationPanelSettled(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-text-"]')
    .first();
  await source
    .getByLabel("文案提示词")
    .fill("请联系 ada@studio.test 写一句介绍");
  await source.getByRole("button", { name: "生成文案" }).click();
  const result = page.locator(
    '.demo-result-node[data-source="provider"][data-kind="text"]',
  );
  await expect(result).toContainText("已脱敏生成");
  expect(body).not.toContain("ada@studio.test");
  expect(body).toContain("{{EMAIL_");
  await page.reload();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await selectSettingsSection(page, "模型接入");
  await expect(page.getByRole("combobox", { name: "路由策略" })).toContainText(
    "主备顺序",
  );
});

test("本体认证刷新后保留，并在生成前拦住缺属性的提示词", async ({ page }) => {
  const endpoint = "http://127.0.0.1:19439/v1/chat/completions";
  let requests = 0;
  await page.route(endpoint, async (route) => {
    requests += 1;
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"choices":[{"delta":{"content":"小林已确认"}}]}\n\ndata: [DONE]\n\n',
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: "模型接入…", exact: true })
    .click();
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await page.getByLabel("接口地址").fill("http://127.0.0.1:19439/v1");
  await page
    .getByLabel("API Key", { exact: true })
    .fill("fixture-ontology-key");
  await page.getByLabel("模型名称").fill("gpt-ontology-test");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await waitForConversationPanelSettled(page);
  await page.evaluate(() => {
    const snap = JSON.parse(
      localStorage.getItem("kk-studio-next:creation:v1") ?? "{}",
    );
    const projectId = snap.activeProjectId;
    localStorage.setItem(
      "kk-studio-next:ontology-certification:v1",
      JSON.stringify({
        [projectId]: {
          concepts: [
            {
              id: "asset:小林",
              name: "小林",
              kind: "character",
              attributes: [
                { name: "外观", value: "", required: true, certified: false },
              ],
            },
          ],
          holds: [],
        },
      }),
    );
  });
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-text-"]')
    .first();
  await source.getByLabel("文案提示词").fill("小林站在雨里");
  await source.getByRole("button", { name: "生成文案" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const snap = JSON.parse(
          localStorage.getItem("kk-studio-next:creation:v1") ?? "{}",
        );
        return (snap.projects ?? [])
          .flatMap(
            (item: { tasks?: Array<{ error?: string }> }) => item.tasks ?? [],
          )
          .map((task: { error?: string }) => task.error ?? "")
          .join(" ");
      }),
    )
    .toContain("小林");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await selectSettingsSection(page, "记忆管理");
  const cert = page.getByRole("region", { name: "本体认证" });
  await expect(cert).toContainText("小林");
  await cert.getByRole("button", { name: "一键补全认证" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  const again = page
    .locator('.canvas-node[data-node-id^="added-text-"]')
    .first();
  await again.getByRole("button", { name: "生成文案" }).click();
  await expect(
    page.locator('.demo-result-node[data-source="provider"][data-kind="text"]'),
  ).toContainText("小林已确认");
  expect(requests).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await waitForConversationPanelSettled(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await selectSettingsSection(page, "记忆管理");
  await expect(page.getByRole("region", { name: "本体认证" })).toContainText(
    "已认证",
  );
});
