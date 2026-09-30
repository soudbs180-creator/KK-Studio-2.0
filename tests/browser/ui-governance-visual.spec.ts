import { expect, test } from "@playwright/test";

test("Figma governance primitives keep one rendered geometry contract", async ({
  page,
}) => {
  await page.goto("/");

  const geometry = await page.evaluate(() => {
    const host = document.createElement("div");
    host.innerHTML = `
      <button class="kk-button">次要操作</button>
      <button class="kk-button kk-button--primary">主要操作</button>
      <span class="kk-icon-slot" data-size="sm"></span>
      <span class="kk-icon-slot" data-size="md"></span>
      <span class="kk-icon-slot" data-size="lg"></span>
    `;
    document.body.append(host);
    const [secondary, primary, sm, md, lg] = Array.from(
      host.children,
    ) as HTMLElement[];
    const css = (element: Element) => getComputedStyle(element);
    return {
      secondaryHeight: css(secondary).height,
      primaryHeight: css(primary).height,
      secondaryRadius: css(secondary).borderRadius,
      secondaryFontSize: css(secondary).fontSize,
      secondaryLineHeight: css(secondary).lineHeight,
      iconSizes: [css(sm).width, css(md).width, css(lg).width],
    };
  });

  expect(geometry).toMatchObject({
    secondaryHeight: "32px",
    primaryHeight: "40px",
    secondaryRadius: "8px",
    secondaryFontSize: "14px",
    secondaryLineHeight: "20px",
    iconSizes: ["16px", "20px", "24px"],
  });
});
