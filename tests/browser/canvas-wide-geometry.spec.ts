import { expect, test, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  emptySnapshot,
  projectChatView,
  serializeCreationSnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model";
import { createProjectCanvas } from "../../src/domain/projectCanvas";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems";
import { expandSidebar, waitForConversationPanelSettled } from "./helpers";

const ids = {
  upstream: "geometry-upstream",
  subject: "geometry-subject",
  target: "geometry-target",
  incoming: "geometry-incoming-result",
  outgoing: "connector-geometry-target",
};
const scales = [0.21, 0.23333333333333334, 0.25];
const mediaCases = [
  { label: "宽图", width: 1200, height: 300 },
  { label: "16:9", width: 1200, height: 675 },
  { label: "竖图", width: 600, height: 900 },
  { label: "方图", width: 600, height: 600 },
];

function textItem(id: string, title: string): CanvasCollectionItem {
  return {
    id,
    title,
    description: "synthetic geometry fixture",
    kind: "text",
    result: {
      id: `${id}-content`,
      kind: "text",
      title,
      description: "synthetic geometry fixture",
      source: "provider",
      text: "Synthetic local text; no model was called.",
    },
  };
}

async function configureSyntheticConnection(page: Page): Promise<void> {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-key");
  await page.getByLabel("模型名称").fill("image-test");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}

async function snapshotEdges(page: Page) {
  const stored = await page.evaluate(
    () =>
      new Promise<CreationSnapshot>((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("creation")
            .objectStore("creation")
            .get("snapshot");
          read.onsuccess = () => {
            db.close();
            resolve(read.result as CreationSnapshot);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
  return stored.projects.find(
    (project) => project.id === stored.activeProjectId,
  )!.canvas.edges;
}

async function geometrySample(page: Page) {
  return page.evaluate((ids) => {
    const node = (id: string) =>
      document.querySelector<HTMLElement>(`[data-node-id="${id}"]`)!;
    const body = (id: string) =>
      node(id).querySelector<HTMLElement>(".demo-result-node")!;
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const hit = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      return { hit: element.contains(target), rect: box(element) };
    };
    const curve = (id: string, source: string, target: string) => {
      const path = document.querySelector<SVGPathElement>(
        `path[data-testid="${id}"]`,
      )!;
      const matrix = path.getScreenCTM();
      if (!matrix) throw new Error(`missing screen matrix for ${id}`);
      const length = path.getTotalLength();
      const point = (distance: number) => {
        const value = path.getPointAtLength(distance).matrixTransform(matrix);
        return { x: value.x, y: value.y };
      };
      const start = point(0);
      const end = point(length);
      const sourceBox = box(body(source));
      const targetBox = box(body(target));
      const cut = box(path.closest(".connection")!.querySelector("button")!);
      return {
        d: path.getAttribute("d"),
        length,
        start,
        end,
        middle: point(length / 2),
        deltas: {
          startX: start.x - sourceBox.right,
          startY: start.y - sourceBox.y - sourceBox.height / 2,
          endX: end.x - targetBox.x,
          endY: end.y - targetBox.y - targetBox.height / 2,
          cutX: cut.x + cut.width / 2 - (start.x + end.x) / 2,
          cutY: cut.y + cut.height / 2 - (start.y + end.y) / 2,
        },
      };
    };
    const stage = document.querySelector<HTMLElement>(
      '[data-testid="canvas-stage"]',
    )!;
    const scale = Number(stage.style.getPropertyValue("--canvas-scale"));
    const subject = box(body(ids.subject));
    const composer = node(ids.subject).querySelector<HTMLElement>(
      '[data-testid="image-composer"]',
    )!;
    const composerBox = box(composer);
    const port = node(ids.subject).querySelector<HTMLButtonElement>(
      ".node-add-follow",
    )!;
    const generate = composer.querySelector<HTMLButtonElement>(
      '[aria-label="生成图片"]',
    )!;
    const incoming = curve(ids.incoming, ids.upstream, ids.subject);
    const outgoing = curve(ids.outgoing, ids.subject, ids.target);
    return {
      scale,
      subject,
      composer: composerBox,
      gap: (composerBox.y - subject.bottom) / scale,
      port: hit(port),
      generate: hit(generate),
      generateDisabled: generate.disabled,
      portGap: port.getBoundingClientRect().x - outgoing.start.x,
      portY:
        port.getBoundingClientRect().y +
        port.getBoundingClientRect().height / 2 -
        outgoing.start.y,
      incoming,
      outgoing,
      viewport: { width: innerWidth, height: innerHeight },
      actionsZ: getComputedStyle(port.parentElement!).zIndex,
      composerZ: getComputedStyle(composer).zIndex,
      composerPointer: getComputedStyle(composer).pointerEvents,
      stylesheets: [...document.styleSheets].map((sheet) => sheet.href),
      scripts: [...document.scripts].map((script) => script.src),
    };
  }, ids);
}

for (const media of mediaCases) {
  for (const scale of scales) {
    for (const expanded of [false, true]) {
      test(`${media.label} ${scale * 100}% ${expanded ? "展开" : "折叠"}实际连线贴合主体`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        const blockedRequests: { method: string; url: string }[] = [];
        await page.route(/^https?:\/\//, async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.origin === "http://127.0.0.1:1423") return route.continue();
          blockedRequests.push({
            method: request.method(),
            url: url.origin + url.pathname,
          });
          return route.abort();
        });
        await page.goto("/");
        const image = await page.evaluate(({ width, height }) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.fillRect(0, 0, width, height);
          return canvas.toDataURL("image/png");
        }, media);
        const subject: CanvasCollectionItem = {
          id: ids.subject,
          title: `合成${media.label}结果`,
          description: "synthetic geometry fixture",
          kind: "image",
          model: "image-test",
          prompt: "layout only",
          mediaWidth: media.width,
          mediaHeight: media.height,
          preview: image,
          result: {
            id: `${ids.subject}-content`,
            kind: "image",
            title: `合成${media.label}结果`,
            description: "synthetic geometry fixture",
            source: "provider",
            src: image,
          },
        };
        const items = [
          textItem(ids.upstream, "合成上游文案"),
          subject,
          textItem(ids.target, "合成下游文案"),
        ];
        const base = createProject({
          prompt: "",
          model: "image-test",
          kind: "image",
          attachments: [],
        });
        base.chats![base.activeChatId!].messages = [];
        const project = projectChatView({
          ...base,
          name: `SVG geometry ${media.label} ${scale}`,
          nameSource: "manual",
          items,
          canvas: {
            ...createProjectCanvas(items),
            positions: {
              [ids.upstream]: { x: -350, y: 500 },
              [ids.subject]: { x: 500, y: 500 },
              [ids.target]: { x: 1800, y: 500 },
            },
            edges: [
              {
                id: ids.incoming,
                source: ids.upstream,
                target: ids.subject,
                kind: "result",
              },
            ],
            viewport: { x: 150, y: 100, scale },
          },
        });
        const value = serializeCreationSnapshot({
          ...emptySnapshot(),
          version: 3,
          revision: Date.now(),
          activeProjectId: project.id,
          projects: [project],
        });
        await page.evaluate(
          ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
          { key: CREATION_STORAGE_KEY, value },
        );
        await page.reload();
        const samples: Awaited<ReturnType<typeof geometrySample>>[] = [];
        let phase = "configure-and-open";
        try {
          await configureSyntheticConnection(page);
          await expandSidebar(page);
          await page
            .getByRole("button", { name: "项目库", exact: true })
            .click();
          await page
            .locator(".project-library-card")
            .filter({ hasText: project.name })
            .click();
          await expect(
            page.getByRole("region", { name: "无限画布" }),
          ).toBeVisible();
          await waitForConversationPanelSettled(page);
          const closeChat = page.getByRole("button", {
            name: "收起对话",
            exact: true,
          });
          if (await closeChat.isVisible()) await closeChat.click();
          await expect(page.locator(".conversation-panel")).toBeHidden();
          const node = page.getByTestId(`canvas-node-${ids.subject}`);
          await expect
            .poll(() =>
              node.locator(".demo-result-preview img").evaluate((element) => ({
                width: (element as HTMLImageElement).naturalWidth,
                height: (element as HTMLImageElement).naturalHeight,
              })),
            )
            .toEqual({ width: media.width, height: media.height });
          await node.focus();
          await node.press("Enter");
          const composer = node.getByTestId("image-composer");
          await expect(composer).toBeVisible();
          if (expanded)
            await composer
              .getByRole("button", { name: "展开提示词", exact: true })
              .click();
          await expect
            .poll(() =>
              composer.evaluate(
                (element) => (element as HTMLElement).offsetHeight,
              ),
            )
            .toBe(expanded ? 330 : 237);
          await expect
            .poll(() =>
              composer.evaluate((element) =>
                element
                  .getAnimations({ subtree: true })
                  .every((animation) => animation.playState !== "running"),
              ),
            )
            .toBe(true);
          const stage = page.getByTestId("canvas-stage");
          const exactScale = () =>
            stage.evaluate((element) =>
              Number(
                (element as HTMLElement).style.getPropertyValue(
                  "--canvas-scale",
                ),
              ),
            );
          await expect.poll(exactScale).toBeCloseTo(scale, 10);
          const transformBefore = await stage.getAttribute("style");
          const positionBefore = await node.evaluate((element) => ({
            left: element.style.left,
            top: element.style.top,
          }));
          const port = node.locator(".node-add-follow");
          phase = "drag-outgoing";
          const portBox = (await port.boundingBox())!;
          const targetBody = page
            .getByTestId(`canvas-node-${ids.target}`)
            .locator(".demo-result-node");
          expect(
            await targetBody.evaluate((element) => {
              const box = element.getBoundingClientRect();
              return element.contains(
                document.elementFromPoint(
                  box.x + box.width / 2,
                  box.y + box.height / 2,
                ),
              );
            }),
            "text target center hit",
          ).toBe(true);
          const targetBox = (await targetBody.boundingBox())!;
          const origin = {
            x: portBox.x + portBox.width / 2,
            y: portBox.y + portBox.height / 2,
          };
          await page.mouse.move(origin.x, origin.y);
          await page.mouse.down();
          await page.mouse.move(origin.x + 12, origin.y, { steps: 3 });
          await expect(
            page.getByTestId("connection-drag-preview"),
          ).toBeVisible();
          await page.mouse.move(
            targetBox.x + targetBox.width / 2,
            targetBox.y + targetBox.height / 2,
            { steps: 8 },
          );
          await expect(
            page.getByTestId(`canvas-node-${ids.target}`),
          ).toHaveClass(/is-connection-target/);
          await page.mouse.up();
          await expect(page.getByTestId(ids.outgoing)).toHaveCount(1);
          phase = "persist-connected-graph";
          await expect(page.getByTestId("connection-drag-preview")).toHaveCount(
            0,
          );
          await expect(page.locator(".add-node-menu")).toHaveCount(0);
          await expect(page.locator("[data-canvas-node]")).toHaveCount(3);
          await expect(stage).toHaveAttribute("style", transformBefore!);
          expect(
            await node.evaluate((element) => ({
              left: element.style.left,
              top: element.style.top,
            })),
          ).toEqual(positionBefore);
          await expect
            .poll(() => snapshotEdges(page))
            .toEqual([
              {
                id: ids.incoming,
                source: ids.upstream,
                target: ids.subject,
                kind: "result",
              },
              {
                id: ids.outgoing,
                source: ids.subject,
                target: ids.target,
                kind: "reference",
              },
            ]);
          phase = "measure-geometry";
          await expect.poll(exactScale).toBeCloseTo(scale, 10);
          const sample = await geometrySample(page);
          samples.push(sample);
          const label = expanded ? "expanded" : "collapsed";
          await info.attach(`geometry-${label}`, {
            body: JSON.stringify({ expanded, ...sample }, null, 2),
            contentType: "application/json",
          });
          await page.screenshot({
            path: info.outputPath(`geometry-${label}.png`),
          });
          for (const [direction, edge] of [
            ["incoming", sample.incoming],
            ["outgoing", sample.outgoing],
          ] as const) {
            expect
              .soft(
                Number.isFinite(edge.length) && edge.length > 0,
                `${label} ${direction} curve length`,
              )
              .toBe(true);
            for (const [key, delta] of Object.entries(edge.deltas)) {
              expect
                .soft(Math.abs(delta), `${label} ${direction} ${key}`)
                .toBeLessThan(0.1);
            }
          }
          expect.soft(sample.portGap, `${label} port gap`).toBeCloseTo(8, 1);
          expect.soft(sample.portY, `${label} port center`).toBeCloseTo(0, 1);
          expect.soft(sample.gap, `${label} composer gap`).toBeCloseTo(10, 1);
          expect.soft(sample.port.hit, `${label} port hit`).toBe(true);
          expect.soft(sample.generate.hit, `${label} generate hit`).toBe(true);
          expect
            .soft(sample.generateDisabled, `${label} generate enabled`)
            .toBe(false);
          expect
            .soft(sample.composer.bottom, `${label} composer visible`)
            .toBeLessThan(sample.viewport.height);
        } finally {
          if (!samples.length && !page.isClosed()) {
            const setup = await page.evaluate((ids) => {
              const stage = document.querySelector<HTMLElement>(
                '[data-testid="canvas-stage"]',
              );
              return {
                actualScale: stage?.style.getPropertyValue("--canvas-scale"),
                nodes: [ids.upstream, ids.subject, ids.target].map((id) => {
                  const node = document.querySelector<HTMLElement>(
                    `[data-node-id="${id}"]`,
                  );
                  const body = node?.querySelector(".demo-result-node");
                  const port = node?.querySelector(".node-add-follow");
                  const bounds = port?.getBoundingClientRect();
                  const hit = bounds
                    ? document.elementFromPoint(
                        bounds.x + bounds.width / 2,
                        bounds.y + bounds.height / 2,
                      )
                    : null;
                  return {
                    id,
                    className: node?.className,
                    body: body?.getBoundingClientRect().toJSON(),
                    bodyHit: body
                      ? body.contains(
                          document.elementFromPoint(
                            body.getBoundingClientRect().x +
                              body.getBoundingClientRect().width / 2,
                            body.getBoundingClientRect().y +
                              body.getBoundingClientRect().height / 2,
                          ),
                        )
                      : null,
                    port: bounds?.toJSON(),
                    portHit: port ? port.contains(hit) : null,
                  };
                }),
              };
            }, ids);
            await info.attach("setup-geometry", {
              body: JSON.stringify({ phase, ...setup }, null, 2),
              contentType: "application/json",
            });
            await page.screenshot({
              path: info.outputPath("setup-failure.png"),
            });
          }
          await info.attach("geometry-summary", {
            body: JSON.stringify(
              {
                fixtureOnly: true,
                synthetic: true,
                media,
                requestedScale: scale,
                expanded,
                phase,
                samples,
                blockedRequests,
              },
              null,
              2,
            ),
            contentType: "application/json",
          });
        }
        expect(
          blockedRequests.filter((request) =>
            /\/images\/(generations|edits)|\/responses$|\/chat\/completions$/.test(
              request.url,
            ),
          ),
        ).toEqual([]);
      });
    }
  }
}
