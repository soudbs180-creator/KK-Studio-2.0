import { expect, test } from "@playwright/test";
import {
  openWorkspace,
  uploadCanvasMedia,
  selectSettingsSection,
} from "./helpers";
import { readFileSync } from "node:fs";

test("客户端录制的真实 MP4 可逐帧解码并展开参考卡", async ({ page }) => {
  test.setTimeout(90000);
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).last();
  await node
    .locator('input[type="file"][accept^="video/"]:not([multiple])')
    .setInputFiles("tests/fixtures/media/client-shots.mp4");
  await expect(node.locator(".video-placeholder video")).toBeVisible();
  await node.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "逐帧拉片", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "展开为画布参考卡", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("button", { name: "展开为画布参考卡", exact: true })
    .click();
  await expect(
    page.locator('.canvas-node[data-testid^="canvas-node-shot-"]'),
  ).toHaveCount(2);
});

test("真实分镜任务通过模型协议后由用户审阅入画布与资产，重载保留", async ({
  page,
}) => {
  const board = {
    title: "回家",
    shots: [
      {
        id: "1",
        scene: "门口",
        description: "小林穿红衣走入门口",
        dialogue: "我回来了",
        durationSeconds: 3,
        shotSize: "中景",
        cameraMovement: "固定",
        characters: ["小林"],
        props: [],
        assetIds: [],
      },
    ],
  };
  let requests = 0;
  await page.route(
    "http://127.0.0.1:19436/v1/chat/completions",
    async (route) => {
      requests++;
      expect(route.request().postDataJSON().model).toBe(
        "gpt-storyboard-fixture",
      );
      expect(route.request().postDataJSON().messages[0].content).toContain(
        "小林",
      );
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(board) } }] })}\n\ndata: [DONE]\n\n`,
      });
    },
  );
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await selectSettingsSection(page, "模型接入");
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await page.getByLabel("接口地址").fill("http://127.0.0.1:19436/v1");
  await page
    .getByLabel("API Key", { exact: true })
    .fill("fixture-storyboard-key");
  await page.getByLabel("模型名称").fill("gpt-storyboard-fixture");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.evaluate(() => {
    const key = "kk-studio-next:provider-connections:v1";
    const connections = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          ...connections[0],
          id: "disabled-first",
          state: "disabled",
          model: "gpt-disabled",
        },
        ...connections,
      ]),
    );
  });
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "小说 / 剧本转分镜", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "小说 / 剧本转分镜",
    exact: true,
  });
  await dialog
    .getByLabel("小说 / 剧本", { exact: true })
    .fill("小林穿红衣走入门口，说：我回来了。");
  await dialog.getByRole("button", { name: "生成分镜", exact: true }).click();
  await expect(dialog).toContainText("一致性检查通过");
  const apply = dialog.getByRole("button", {
    name: "添加到画布 / 资产",
    exact: true,
  });
  await apply.click();
  await expect(dialog).toContainText("分镜已保存");
  await expect(apply).toBeDisabled();
  expect(requests).toBe(1);
  await dialog.getByRole("button", { name: "关闭对话框", exact: true }).click();
  await expect(
    page.locator(
      '.canvas-node[data-testid^="canvas-node-storyboard-"]:not([data-testid^="canvas-node-storyboard-source-"])',
    ),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  const card = page.locator(".asset-card").filter({ hasText: "1 · 门口" });
  await card.dblclick();
  await expect(page.locator(".asset-text-preview")).toContainText("我回来了");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(
    page.locator(
      '.canvas-node[data-testid^="canvas-node-storyboard-"]:not([data-testid^="canvas-node-storyboard-source-"])',
    ),
  ).toHaveCount(1);
  expect(requests).toBe(1);
});

test("真实 Floorplan 文件经工具栏写入节点与连线，刷新仍保留", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  const menu = page.getByRole("menu", { name: "帮助与快捷键", exact: true });
  await menu
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/floorplan/architecture.json");
  await expect(menu.getByRole("status")).toContainText("已添加");
  const expected = JSON.parse(
    readFileSync("tests/fixtures/floorplan/architecture.json", "utf8"),
  ).nodes.length;
  const count = () =>
    page.evaluate(() => {
      const snapshot = JSON.parse(
        localStorage.getItem("kk-studio-next:creation:v1")!,
      );
      const project = snapshot.projects.find(
        (p: { id: string }) => p.id === snapshot.activeProjectId,
      );
      return {
        nodes: project.items.filter((i: { id: string }) =>
          i.id.startsWith("bp-"),
        ).length,
        edges: project.canvas.edges.filter((e: { id: string }) =>
          e.id.startsWith("bp-"),
        ).length,
      };
    });
  await expect.poll(async () => (await count()).nodes).toBe(expected);
  expect((await count()).edges).toBeGreaterThan(0);
  await page.reload();
  await expect.poll(async () => (await count()).nodes).toBe(expected);
});

test("真实视频逐帧解码并归档参考卡，保留原件", async ({ page }) => {
  test.setTimeout(90000);
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).last();
  await uploadCanvasMedia(node, "video");
  await node.focus();
  await page.keyboard.press("Enter");
  const action = page.getByRole("button", { name: "逐帧拉片", exact: true });
  await expect(action).toBeVisible();
  await action.click();
  const expand = page.getByRole("button", {
    name: "展开为画布参考卡",
    exact: true,
  });
  await expect(expand).toBeVisible({ timeout: 60000 });
  await expand.click();
  await expect(
    page.getByText("切镜参考卡已归档并添加到画布，原视频保留。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = JSON.parse(
          localStorage.getItem("kk-studio-next:creation:v1")!,
        );
        return s.projects
          .flatMap(
            (p: {
              items: Array<{
                id: string;
                assetId?: string;
                referenceOnly?: boolean;
              }>;
            }) => p.items,
          )
          .filter(
            (i: { id: string; assetId?: string; referenceOnly?: boolean }) =>
              i.id.startsWith("shot-") && i.assetId && i.referenceOnly,
          ).length;
      }),
    )
    .toBeGreaterThan(0);
  await expect(node.locator(".video-placeholder video")).toBeVisible();
});

test("分镜入口展示实际约束表单并在无文本模型时明确拒绝", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "小说 / 剧本转分镜", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "小说 / 剧本转分镜",
    exact: true,
  });
  await dialog
    .getByLabel("小说 / 剧本", { exact: true })
    .fill("小林穿红衣走入门口，说：我回来了。");
  await dialog.getByRole("button", { name: "添加约束", exact: true }).click();
  await dialog.getByLabel("名称", { exact: true }).fill("小林");
  await dialog.getByLabel("固定特征", { exact: true }).fill("红衣、银钥匙");
  await dialog.getByRole("button", { name: "生成分镜", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("配置文本模型");
  await expect(
    dialog.getByRole("button", { name: "添加到画布 / 资产", exact: true }),
  ).toHaveCount(0);
});
