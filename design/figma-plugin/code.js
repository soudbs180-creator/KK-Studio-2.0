// Native Figma development plugin. Creates editable text and auto-layout frames.
// Never modifies the user's source page. No network or external dependencies.
const PAGE_NAME = "KK Studio · 交互补充 2026-09-06";
const C = {
  bg: "#161616",
  card: "#1f1f1f",
  raised: "#202020",
  border: "#3c3c3c",
  text: "#dadada",
  muted: "#858585",
};
const created = [];
function rgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}
function paint(hex) {
  return [{ type: "SOLID", color: rgb(hex) }];
}
function box(parent, name, width, height, color = C.bg, radius = 0) {
  const node = figma.createFrame();
  created.push(node.id);
  node.name = name;
  node.resize(width, height);
  node.fills = paint(color);
  node.cornerRadius = radius;
  parent.appendChild(node);
  return node;
}
function stack(parent, name, width, direction = "VERTICAL", gap = 12) {
  const node = box(parent, name, width, 40);
  node.fills = [];
  node.layoutMode = direction;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "FIXED";
  node.itemSpacing = gap;
  return node;
}
function text(
  parent,
  value,
  size = 14,
  bold = false,
  color = C.text,
  width = 200,
) {
  const node = figma.createText();
  created.push(node.id);
  node.fontName = { family: "Inter", style: bold ? "Bold" : "Regular" };
  node.fontSize = size;
  node.characters = value;
  node.fills = paint(color);
  node.resize(width, Math.ceil(size * 1.5));
  node.textAutoResize = "HEIGHT";
  parent.appendChild(node);
  node.name = value;
  return node;
}
function button(parent, label, width, primary = false) {
  const node = box(parent, label, width, 36, primary ? C.text : C.raised, 8);
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  const t = text(node, label, 12, false, primary ? C.bg : C.text, width - 20);
  t.textAlignHorizontal = "CENTER";
  return node;
}
function outlined(node) {
  node.strokes = paint(C.border);
  node.strokeWeight = 1;
}
function placed(node, x, y) {
  node.x = x;
  node.y = y;
  return node;
}
function screen(page, name, x, width = 900, height = 700) {
  const node = box(page, name, width, height, C.bg, 20);
  node.x = x;
  node.y = 40;
  outlined(node);
  return node;
}
function sidebar(frame, title, items, selected) {
  placed(text(frame, title, 14, false, C.muted), 42, 38);
  const list = placed(stack(frame, "侧栏导航", 263, "VERTICAL", 12), 36, 80);
  for (const item of items) {
    const row = box(
      list,
      item,
      263,
      40,
      item === selected ? C.border : C.bg,
      10,
    );
    row.layoutMode = "HORIZONTAL";
    row.counterAxisAlignItems = "CENTER";
    row.paddingLeft = 14;
    text(row, item, 14, false, C.muted, 232);
  }
}
async function main() {
  const existing = figma.root.children.find((page) => page.name === PAGE_NAME);
  if (existing) {
    await figma.setCurrentPageAsync(existing);
    figma.viewport.scrollAndZoomIntoView(existing.children);
    figma.closePlugin("补充页面已存在，已为你打开。");
    return;
  }
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
  ]);
  const page = figma.createPage();
  page.name = PAGE_NAME;
  created.push(page.id);
  await figma.setCurrentPageAsync(page);
  const empty = screen(page, "资产管理 / 搜索无结果", 40);
  placed(text(empty, "资产管理", 14, false, C.muted), 42, 38);
  placed(text(empty, "KK工作流画布", 16, true, C.text, 220), 319, 38);
  const tabs = placed(stack(empty, "资源范围", 232, "HORIZONTAL", 3), 36, 81);
  button(tabs, "画布", 114);
  button(tabs, "资产", 114);
  const search = placed(box(empty, "搜索框", 232, 27, C.raised, 20), 36, 132);
  placed(text(search, "未找到的关键词", 11, false, C.muted, 200), 12, 6);
  const filters = placed(
    stack(empty, "筛选条件", 205, "HORIZONTAL", 8),
    577,
    33,
  );
  for (const value of ["类型", "标签", "时间"]) button(filters, value, 63);
  const state = placed(stack(empty, "搜索空态", 500, "VERTICAL", 16), 340, 280);
  state.counterAxisAlignItems = "CENTER";
  const heading = text(state, "没有找到匹配的资产", 16, true, C.text, 400);
  heading.textAlignHorizontal = "CENTER";
  const copy = text(
    state,
    "试试其他关键词，或清除筛选条件。",
    12,
    false,
    C.muted,
    400,
  );
  copy.textAlignHorizontal = "CENTER";
  button(state, "清除筛选", 106, true);
  const create = screen(page, "资产管理 / 创建主体", 1000, 380, 350);
  const form = placed(stack(create, "主体表单", 324, "VERTICAL", 20), 28, 28);
  text(form, "创建主体", 18, true, C.text, 324);
  text(form, "将角色、产品或场景整理为可复用的主体。", 12, false, C.muted, 324);
  const field = stack(form, "名称字段", 324, "VERTICAL", 10);
  text(field, "主体名称", 13, false, C.text, 324);
  const input = box(field, "名称输入框", 324, 43, C.raised, 8);
  outlined(input);
  placed(text(input, "例如：品牌代言人", 13, false, C.muted, 290), 12, 12);
  text(form, "保存在本次会话中，可继续添加参考图片。", 12, false, C.muted, 324);
  const actions = stack(form, "表单操作", 324, "HORIZONTAL", 16);
  actions.primaryAxisAlignItems = "MAX";
  button(actions, "取消", 72);
  button(actions, "创建主体", 100, true);
  const provider = screen(page, "设置 / 模型供应商空态", 1440);
  sidebar(
    provider,
    "设置",
    [
      "通用",
      "账号管理",
      "储存",
      "网络",
      "记忆",
      "模型供应商",
      "Skill",
      "MCP",
      "Comfy UI",
      "高级",
      "软件更新",
    ],
    "模型供应商",
  );
  const content = placed(
    stack(provider, "供应商内容", 508, "VERTICAL", 24),
    343,
    38,
  );
  text(content, "模型供应商", 16, true, C.text, 508);
  text(
    content,
    "连接你常用的模型服务，配置创作能力。",
    14,
    false,
    C.muted,
    508,
  );
  const card = box(content, "未连接提示", 508, 188, C.card, 12);
  card.layoutMode = "VERTICAL";
  card.paddingTop = 28;
  card.paddingLeft = 24;
  card.paddingRight = 24;
  card.itemSpacing = 16;
  outlined(card);
  text(card, "还没有连接模型供应商", 16, true, C.text, 460);
  text(
    card,
    "模型服务将在后续接入。当前可先确认界面与交互流程。",
    13,
    false,
    C.muted,
    460,
  );
  const row = stack(content, "供应商信息", 508, "VERTICAL", 12);
  text(row, "供应商名称", 13, true, C.text, 508);
  const field2 = box(row, "供应商名称输入框", 508, 42, C.raised, 8);
  placed(text(field2, "我的模型服务", 13, false, C.muted, 450), 12, 11);
  for (const frame of [empty, create, provider]) {
    frame.clipsContent = true;
  }
  figma.currentPage.selection = [empty, create, provider];
  figma.viewport.scrollAndZoomIntoView([empty, create, provider]);
  figma.closePlugin("已创建 3 张可编辑补充画板。原始页面保持完整。");
}
main().catch((error) =>
  figma.closePlugin("创建失败：" + String(error.message || error)),
);
