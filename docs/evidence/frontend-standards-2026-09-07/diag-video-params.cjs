/* 视频参数弹层 170:8853 同状态比对：测量实现侧弹层几何/项/选中态/颜色。 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://127.0.0.1:1422");
  await page.locator(".video-placeholder").last().click();
  await page.getByTestId("video-composer").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "视频参数", exact: true }).click();
  const menu = page.locator(".node-popover.parameter-menu");
  await menu.waitFor({ state: "visible", timeout: 8000 });

  const box = await menu.boundingBox();
  const style = await menu.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      border: s.borderTopColor + " " + s.borderTopWidth,
      radius: s.borderTopLeftRadius,
      font: s.fontFamily,
    };
  });
  console.log("POPOVER:", JSON.stringify({ x: box.x, y: box.y, w: box.width, h: box.height, ...style }, null, 2));

  // 各小节与控件
  const sections = await menu.evaluate((el) => {
    const out = [];
    el.querySelectorAll(".param-section, .video-duration").forEach((sec) => {
      const r = sec.getBoundingClientRect();
      const label = sec.querySelector("small")?.textContent ?? sec.querySelector("label")?.textContent ?? "";
      out.push({
        kind: sec.className,
        label: label.trim().slice(0, 20),
        x: Math.round(r.x - el.getBoundingClientRect().x),
        y: Math.round(r.y - el.getBoundingClientRect().y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    });
    return out;
  });
  console.log("SECTIONS:", JSON.stringify(sections, null, 2));

  const quality = await menu.evaluate((el) => {
    return [...el.querySelectorAll(".quality-btn")].map((b) => {
      const r = b.getBoundingClientRect();
      const s = getComputedStyle(b);
      return {
        text: b.textContent.trim(),
        pressed: b.getAttribute("aria-pressed"),
        x: Math.round(r.x - el.getBoundingClientRect().x),
        y: Math.round(r.y - el.getBoundingClientRect().y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundColor,
        border: s.borderTopColor,
        radius: s.borderTopLeftRadius,
        font: s.fontSize + " " + s.fontFamily + " " + s.fontWeight,
        color: s.color,
      };
    });
  });
  console.log("QUALITY:", JSON.stringify(quality, null, 2));

  const ratios = await menu.evaluate((el) => {
    return [...el.querySelectorAll(".ratio-btn")].map((b) => {
      const r = b.getBoundingClientRect();
      const s = getComputedStyle(b);
      return {
        text: b.textContent.trim(),
        pressed: b.getAttribute("aria-pressed"),
        x: Math.round(r.x - el.getBoundingClientRect().x),
        y: Math.round(r.y - el.getBoundingClientRect().y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundColor,
        border: s.borderTopColor,
        radius: s.borderTopLeftRadius,
        box: (() => {
          const rb = b.querySelector(".ratio-box");
          if (!rb) return null;
          const rr = rb.getBoundingClientRect();
          const rs = getComputedStyle(rb);
          return { w: Math.round(rr.width), h: Math.round(rr.height), border: rs.borderTopColor + " " + rs.borderTopWidth, radius: rs.borderTopLeftRadius };
        })(),
      };
    });
  });
  console.log("RATIOS:", JSON.stringify(ratios, null, 2));

  const adaptive = await menu.evaluate((el) => {
    const b = el.querySelector(".param-adaptive");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const s = getComputedStyle(b);
    return {
      text: b.textContent.trim(),
      pressed: b.getAttribute("aria-pressed"),
      x: Math.round(r.x - el.getBoundingClientRect().x),
      y: Math.round(r.y - el.getBoundingClientRect().y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bg: s.backgroundColor,
      border: s.borderTopColor,
      radius: s.borderTopLeftRadius,
      font: s.fontSize + " " + s.fontWeight,
    };
  });
  console.log("ADAPTIVE:", JSON.stringify(adaptive, null, 2));

  const duration = await menu.evaluate((el) => {
    const d = el.querySelector(".video-duration");
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return {
      x: Math.round(r.x - el.getBoundingClientRect().x),
      y: Math.round(r.y - el.getBoundingClientRect().y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
  console.log("DURATION:", JSON.stringify(duration, null, 2));

  await page.screenshot({ path: "docs/evidence/frontend-standards-2026-09-07/video-params-impl.png", animations: "disabled" });
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
