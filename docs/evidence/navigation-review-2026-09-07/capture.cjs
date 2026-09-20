const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// Read-only browser evidence. Run after building, with preview on port 1422.
// Source: 100:16335 cached design context, 1920 × 1080 board coordinates.
const source = {
  navigation: { x: 1158, y: 84, width: 229, height: 26 },
  zoom: { x: 1158, y: 84, width: 63, height: 26 },
  tools: { x: 1223, y: 84, width: 164, height: 26 },
  menu: { x: 1158, y: 112, width: 97, height: 140 },
};

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:1422');
    await page.getByRole('button', { name: '画布缩放', exact: true }).click();
    await page.getByRole('menuitemradio', { name: '200%', exact: true }).click();
    await page.getByRole('button', { name: '画布缩放', exact: true }).click();
    await page.mouse.move(900, 500);
    await page.evaluate(() => document.fonts.ready);
    const selectors = {
      navigation: '.canvas-top-right', zoom: '.canvas-zoom-trigger',
      tools: '.canvas-navigation-tools', menu: '.canvas-zoom-menu', chat: '.conversation-panel',
    };
    const geometry = {};
    for (const [key, selector] of Object.entries(selectors)) {
      geometry[key] = await page.locator(selector).boundingBox();
    }
    const deltas = {};
    for (const [key, box] of Object.entries(source)) {
      deltas[key] = {};
      for (const [axis, value] of Object.entries(box)) {
        const delta = geometry[key][axis] - value;
        deltas[key][axis] = delta;
        assert.ok(Math.abs(delta) <= 0.5, `${key}.${axis}: source ${value}, browser ${geometry[key][axis]}`);
      }
    }
    const style = await page.locator('.canvas-zoom-menu').evaluate(menu => {
      const css = getComputedStyle(menu);
      return {
        background: css.backgroundColor, border: css.borderColor, radius: css.borderRadius,
        rows: [...menu.querySelectorAll('button')].map(button => {
          const computed = getComputedStyle(button);
          const box = button.getBoundingClientRect();
          return { text: button.textContent, x: box.x, y: box.y, height: box.height,
            color: computed.color, font: computed.font, fontWeight: computed.fontWeight,
            background: computed.backgroundColor };
        }),
      };
    });
    await page.screenshot({ path: path.join(__dirname, 'navigation-200-menu.png'),
      clip: { x: 1158, y: 84, width: 229, height: 168 }, animations: 'disabled' });
    await page.screenshot({ path: path.join(__dirname, 'workspace-1920-same-state.png'), animations: 'disabled' });
    await page.screenshot({ path: path.join(__dirname, 'navigation-chat-spacing.png'),
      clip: { x: 1138, y: 65, width: 766, height: 202 }, animations: 'disabled' });
    const fontWeights = await page.locator('.canvas-top-right').evaluate(navigation =>
      [...navigation.querySelectorAll('button')].map(button => ({
        text: button.textContent, weight: getComputedStyle(button).fontWeight,
      })));
    for (const row of fontWeights) assert.equal(row.weight, '500', `Source Inter Medium: ${row.text}`);
    const report = { capturedAt: new Date().toISOString(), sourceNode: '100:16335',
      sourceRead: '2026-09-07 cached design; current get_design_context returned reauthentication error',
      state: '1920x1080, 200%, zoom menu open, connections visible, pointer away from menu',
      geometry, source, deltas, chatGap: geometry.chat.x - geometry.tools.x - geometry.tools.width,
      style, fontWeights, errors, status: 'Geometry and Medium font weight checked; visual differences documented separately.' };
    fs.writeFileSync(path.join(__dirname, 'comparison.json'), JSON.stringify(report, null, 2));
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ sourceNode: report.sourceNode, deltas, chatGap: report.chatGap, errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
