// KK Studio · 模型接入 UI 深度重构修稿插件 (Figma Native Design Script)
// 依据 KK Studio 2.0 规范，提供纯原生、高精度、符合人机直觉的设置面板重构稿。
// 不污染源画板，在独立页面呈现「CLI 直连极简版」、「官方 API 向导版」与「架构对比说明」。

const PAGE_NAME = "04 · 模型接入 UI 重构 (2026-11-09)";

const C = {
  bgCanvas: "#0e0e11",
  windowBg: "#16161a",
  sidebarBg: "#121215",
  cardBg: "#1c1c22",
  cardHover: "#23232c",
  inputBg: "#141418",
  borderSubtle: "#282832",
  borderFocus: "#3b82f6",
  textPrimary: "#f3f4f6",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  accentPrimary: "#21a673",
  accentHover: "#28c388",
  statusGreen: "#22c55e",
  statusGreenBg: "#143023",
  danger: "#ef4444",
  dangerBg: "#2d1618",
  codeBg: "#0f0f14",
};

const created = [];

function rgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function paint(hex, opacity = 1) {
  return [{ type: "SOLID", color: rgb(hex), opacity }];
}

function box(parent, name, width, height, color = C.windowBg, radius = 0) {
  const node = figma.createFrame();
  created.push(node.id);
  node.name = name;
  node.resize(Math.max(1, width), Math.max(1, height));
  node.fills = color ? paint(color) : [];
  node.cornerRadius = radius;
  parent.appendChild(node);
  return node;
}

function stack(parent, name, width, direction = "VERTICAL", gap = 12) {
  const node = box(parent, name, width, 40, null);
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
  style = "Regular",
  color = C.textPrimary,
  width = null
) {
  const node = figma.createText();
  created.push(node.id);
  node.fontName = { family: "Inter", style: style === "Bold" ? "Bold" : "Regular" };
  node.fontSize = size;
  node.characters = value;
  node.fills = paint(color);
  if (width) {
    node.resize(width, Math.ceil(size * 1.5));
    node.textAutoResize = "HEIGHT";
  } else {
    node.textAutoResize = "WIDTH_AND_HEIGHT";
  }
  parent.appendChild(node);
  node.name = value.slice(0, 32);
  return node;
}

function outlined(node, color = C.borderSubtle, weight = 1) {
  node.strokes = paint(color);
  node.strokeWeight = weight;
}

function button(
  parent,
  label,
  variant = "secondary",
  height = 36,
  minWidth = 72
) {
  const bg =
    variant === "primary"
      ? C.accentPrimary
      : variant === "danger"
      ? C.dangerBg
      : variant === "active-tab"
      ? C.cardHover
      : variant === "ghost"
      ? null
      : C.cardBg;

  const fg =
    variant === "primary"
      ? "#ffffff"
      : variant === "danger"
      ? C.danger
      : variant === "active-tab"
      ? C.textPrimary
      : variant === "ghost"
      ? C.textMuted
      : C.textSecondary;

  const node = box(parent, `Btn: ${label}`, minWidth, height, bg, 8);
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.paddingLeft = 14;
  node.paddingRight = 14;
  node.primaryAxisSizingMode = "AUTO";

  if (variant === "secondary" || variant === "active-tab") {
    outlined(node, variant === "active-tab" ? C.accentPrimary : C.borderSubtle);
  } else if (variant === "danger") {
    outlined(node, C.danger);
  }

  text(node, label, 13, variant === "primary" ? "Bold" : "Regular", fg);
  return node;
}

function pillTab(parent, label, badgeText = "", active = false) {
  const node = box(
    parent,
    `Tab: ${label}`,
    120,
    34,
    active ? C.accentPrimary : C.inputBg,
    17
  );
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.itemSpacing = 6;
  node.paddingLeft = 14;
  node.paddingRight = 14;
  node.primaryAxisSizingMode = "AUTO";

  if (!active) outlined(node, C.borderSubtle);

  text(
    node,
    label,
    13,
    active ? "Bold" : "Regular",
    active ? "#ffffff" : C.textSecondary
  );

  if (badgeText) {
    const b = box(
      node,
      "Badge",
      30,
      18,
      active ? "#156c49" : C.cardBg,
      9
    );
    b.layoutMode = "HORIZONTAL";
    b.paddingLeft = 5;
    b.paddingRight = 5;
    b.primaryAxisSizingMode = "AUTO";
    b.counterAxisAlignItems = "CENTER";
    text(b, badgeText, 10, "Regular", active ? "#d1fae5" : C.textMuted);
  }
  return node;
}

function fieldRow(parent, label, placeholder, width = 680, value = "") {
  const f = stack(parent, `Field: ${label}`, width, "VERTICAL", 6);
  text(f, label, 12, "Bold", C.textSecondary);
  const input = box(f, "Input", width, 38, C.inputBg, 8);
  input.layoutMode = "HORIZONTAL";
  input.counterAxisAlignItems = "CENTER";
  input.paddingLeft = 12;
  input.paddingRight = 12;
  outlined(input, C.borderSubtle);
  text(
    input,
    value ? value : placeholder,
    13,
    "Regular",
    value ? C.textPrimary : C.textMuted
  );
  return f;
}

// 侧栏模板
function renderSidebar(parent, activeName = "模型接入") {
  const sb = box(parent, "设置侧栏", 200, 700, C.sidebarBg, 0);
  sb.layoutMode = "VERTICAL";
  sb.paddingTop = 20;
  sb.paddingBottom = 20;
  sb.paddingLeft = 12;
  sb.paddingRight = 12;
  sb.itemSpacing = 4;
  outlined(sb, C.borderSubtle);

  const titleRow = stack(sb, "顶栏", 176, "HORIZONTAL", 8);
  titleRow.counterAxisAlignItems = "CENTER";
  text(titleRow, "设置", 16, "Bold", C.textPrimary);
  text(titleRow, "KK STUDIO 2.0", 11, "Regular", C.textMuted);

  const groups = [
    { label: "常用", items: ["快捷键管理"] },
    { label: "账户与用量", items: ["个人主页", "套餐与积分"] },
    {
      label: "核心功能",
      items: ["模型接入", "记忆管理", "扩展与 MCP", "网络与代理"],
    },
    { label: "安全与数据", items: ["数据管理", "安全中心"] },
    { label: "系统", items: ["软件更新"] },
  ];

  for (const g of groups) {
    const gHeader = box(sb, "分组头", 176, 26, null);
    gHeader.paddingTop = 8;
    gHeader.paddingLeft = 8;
    text(gHeader, g.label, 11, "Bold", C.textMuted);

    for (const item of g.items) {
      const active = item === activeName;
      const row = box(
        sb,
        item,
        176,
        34,
        active ? C.accentPrimary : null,
        8
      );
      row.layoutMode = "HORIZONTAL";
      row.counterAxisAlignItems = "CENTER";
      row.paddingLeft = 10;
      text(
        row,
        item,
        13,
        active ? "Bold" : "Regular",
        active ? "#ffffff" : C.textSecondary
      );
    }
  }
  return sb;
}

// ==========================================
// 画板 1：CLI 直连重构稿（极简、层级分明、无废话）
// ==========================================
function buildCliScreen(page, x) {
  const win = box(page, "01 · 模型接入 · CLI 直连 (极简重构稿)", 1120, 720, C.windowBg, 16);
  win.x = x;
  win.y = 40;
  win.layoutMode = "HORIZONTAL";
  outlined(win, C.borderSubtle);

  // 1. 侧栏
  renderSidebar(win, "模型接入");

  // 2. 主内容区
  const main = box(win, "Main Content", 920, 720, C.windowBg);
  main.layoutMode = "VERTICAL";
  main.paddingTop = 28;
  main.paddingLeft = 32;
  main.paddingRight = 32;
  main.itemSpacing = 20;

  // 顶栏：标题与渠道
  const header = stack(main, "页面顶栏", 856, "VERTICAL", 4);
  const titleRow = stack(header, "标题行", 856, "HORIZONTAL", 12);
  titleRow.counterAxisAlignItems = "CENTER";
  text(titleRow, "模型接入", 20, "Bold", C.textPrimary);
  const countBadge = box(titleRow, "Badge", 80, 20, C.cardBg, 10);
  countBadge.counterAxisAlignItems = "CENTER";
  countBadge.primaryAxisAlignItems = "CENTER";
  text(countBadge, "5 大核心渠道", 11, "Regular", C.textSecondary);

  text(
    header,
    "管理与配置官方开发者 API、聚合中转路由、命令行开发工具及本地模型引擎。",
    12,
    "Regular",
    C.textMuted
  );

  // 5 大渠道分段 Tabs
  const channelTabs = stack(main, "渠道分段导航", 856, "HORIZONTAL", 8);
  pillTab(channelTabs, "官方直连", "API", false);
  pillTab(channelTabs, "中转路由", "Relay", false);
  pillTab(channelTabs, "账号授权", "OAuth", false);
  pillTab(channelTabs, "CLI 直连", "CLI", true); // Active
  pillTab(channelTabs, "本地模型", "Offline", false);

  // CLI 专属工具子切换
  const toolNav = stack(main, "CLI 工具切换", 856, "HORIZONTAL", 8);
  button(toolNav, "★ Codex 主 Agent", "active-tab", 32);
  button(toolNav, "Gemini CLI", "secondary", 32);
  button(toolNav, "CodeBuddy CLI", "secondary", 32);

  // 核心连接看板卡片
  const card = box(main, "Codex 状态看板卡片", 856, 260, C.cardBg, 12);
  card.layoutMode = "VERTICAL";
  card.paddingTop = 20;
  card.paddingBottom = 20;
  card.paddingLeft = 24;
  card.paddingRight = 24;
  card.itemSpacing = 16;
  outlined(card, C.borderSubtle);

  // 卡片顶栏：状态指示
  const cHeader = stack(card, "状态头", 808, "HORIZONTAL", 12);
  cHeader.counterAxisAlignItems = "CENTER";

  // 绿光状态点
  const dotWrap = box(cHeader, "状态光环", 18, 18, C.statusGreenBg, 9);
  dotWrap.primaryAxisAlignItems = "CENTER";
  dotWrap.counterAxisAlignItems = "CENTER";
  box(dotWrap, "Dot", 8, 8, C.statusGreen, 4);

  text(cHeader, "Codex 主 Agent", 16, "Bold", C.textPrimary);
  const readyTag = box(cHeader, "ReadyTag", 60, 20, C.statusGreenBg, 4);
  readyTag.primaryAxisAlignItems = "CENTER";
  readyTag.counterAxisAlignItems = "CENTER";
  text(readyTag, "已就绪", 11, "Bold", C.statusGreen);

  const fillSpacer = box(cHeader, "Spacer", 350, 10, null);
  text(cHeader, "端口 17371 · 进程活跃", 12, "Regular", C.textMuted);

  text(
    card,
    "已无缝复用本机已登录的官方 Codex 账号，负责上下文对话、任务规划与画布自动化协同。",
    13,
    "Regular",
    C.textSecondary
  );

  // 精炼的权限行（去除了下方啰嗦大段文字，用简洁的 label + 下拉框）
  const permRow = stack(card, "权限配置行", 808, "HORIZONTAL", 16);
  permRow.counterAxisAlignItems = "CENTER";
  text(permRow, "自动化执行权限", 13, "Bold", C.textPrimary);

  const permSelect = box(permRow, "Select", 220, 34, C.inputBg, 6);
  permSelect.layoutMode = "HORIZONTAL";
  permSelect.counterAxisAlignItems = "CENTER";
  permSelect.paddingLeft = 12;
  permSelect.paddingRight = 12;
  outlined(permSelect, C.borderSubtle);
  text(permSelect, "每次询问安全许可 ▾", 12, "Regular", C.textPrimary);

  text(permRow, "ⓘ 在 Agent 改变画布或执行高危操作前弹出即时许可", 12, "Regular", C.textMuted);

  // 操作按钮组 —— 彻底建立视觉层级！
  const actions = stack(card, "按钮层级组", 808, "HORIZONTAL", 12);
  actions.counterAxisAlignItems = "CENTER";
  button(actions, "重新连接 Codex", "primary", 38, 120); // 核心 Primary 品牌绿高亮！
  button(actions, "测试连接状态", "secondary", 38, 100); // Secondary 轮廓
  button(actions, "新建会话上下文", "secondary", 38, 110); // Secondary 轮廓
  const actSpacer = box(actions, "Spacer", 240, 10, null);
  button(actions, "断开连接", "danger", 38, 80); // Danger 弱化在右侧

  // 高级选项（优雅的收起卡片）
  const adv = box(main, "高级连接选项 (折叠)", 856, 44, C.cardBg, 8);
  adv.layoutMode = "HORIZONTAL";
  adv.counterAxisAlignItems = "CENTER";
  adv.paddingLeft = 16;
  adv.paddingRight = 16;
  outlined(adv, C.borderSubtle);
  text(adv, "▸ 高级连接设置（Agent 外部地址、自定义 Token、IPC 代理通信）", 12, "Regular", C.textSecondary);

  // 架构提示说明横幅
  const noteBanner = box(main, "架构分离说明", 856, 50, C.cardBg, 8);
  noteBanner.layoutMode = "HORIZONTAL";
  noteBanner.counterAxisAlignItems = "CENTER";
  noteBanner.paddingLeft = 16;
  noteBanner.paddingRight = 16;
  noteBanner.itemSpacing = 10;
  outlined(noteBanner, "#1e3a2b");
  text(noteBanner, "💡 体验优化", 12, "Bold", C.accentPrimary);
  text(
    noteBanner,
    "已将原混入此处的「浏览器后端 (WebView2)」彻底剥离至「核心功能 › 网络与代理」，聚焦纯粹的 Agent 连接体验。",
    12,
    "Regular",
    C.textSecondary
  );
}

// ==========================================
// 画板 2：官方 API 直连重构稿（1-Click 厂商向导）
// ==========================================
function buildOfficialApiScreen(page, x) {
  const win = box(page, "02 · 模型接入 · 官方 API (1-Click 向导稿)", 1120, 720, C.windowBg, 16);
  win.x = x;
  win.y = 40;
  win.layoutMode = "HORIZONTAL";
  outlined(win, C.borderSubtle);

  // 1. 侧栏
  renderSidebar(win, "模型接入");

  // 2. 主内容区
  const main = box(win, "Main Content", 920, 720, C.windowBg);
  main.layoutMode = "VERTICAL";
  main.paddingTop = 28;
  main.paddingLeft = 32;
  main.paddingRight = 32;
  main.itemSpacing = 20;

  // 顶栏：标题与渠道
  const header = stack(main, "页面顶栏", 856, "VERTICAL", 4);
  const titleRow = stack(header, "标题行", 856, "HORIZONTAL", 12);
  titleRow.counterAxisAlignItems = "CENTER";
  text(titleRow, "模型接入", 20, "Bold", C.textPrimary);
  const countBadge = box(titleRow, "Badge", 80, 20, C.cardBg, 10);
  countBadge.counterAxisAlignItems = "CENTER";
  countBadge.primaryAxisAlignItems = "CENTER";
  text(countBadge, "5 大核心渠道", 11, "Regular", C.textSecondary);

  text(
    header,
    "直接调用原生官方开发者 API，直连厂商数据中心，享受最低调用延迟与完整模型功能。",
    12,
    "Regular",
    C.textMuted
  );

  // 5 大渠道分段 Tabs
  const channelTabs = stack(main, "渠道分段导航", 856, "HORIZONTAL", 8);
  pillTab(channelTabs, "官方直连", "API", true); // Active
  pillTab(channelTabs, "中转路由", "Relay", false);
  pillTab(channelTabs, "账号授权", "OAuth", false);
  pillTab(channelTabs, "CLI 直连", "CLI", false);
  pillTab(channelTabs, "本地模型", "Offline", false);

  // 1-Click 厂商选择网格
  const vendorGrid = stack(main, "厂商预设网格", 856, "HORIZONTAL", 10);
  button(vendorGrid, "★ OpenAI (兼容)", "active-tab", 34);
  button(vendorGrid, "Anthropic Claude", "secondary", 34);
  button(vendorGrid, "Google Gemini", "secondary", 34);
  button(vendorGrid, "DeepSeek", "secondary", 34);
  button(vendorGrid, "SiliconFlow 硅基流动", "secondary", 34);

  // 核心输入卡片
  const card = box(main, "API 表单卡片", 856, 320, C.cardBg, 12);
  card.layoutMode = "VERTICAL";
  card.paddingTop = 20;
  card.paddingBottom = 20;
  card.paddingLeft = 24;
  card.paddingRight = 24;
  card.itemSpacing = 16;
  outlined(card, C.borderSubtle);

  // 卡片头部
  const cHead = stack(card, "卡片头", 808, "HORIZONTAL", 12);
  cHead.counterAxisAlignItems = "CENTER";
  text(cHead, "OpenAI API 连接配置", 15, "Bold", C.textPrimary);
  const lockTag = box(cHead, "LockTag", 140, 22, C.inputBg, 4);
  lockTag.counterAxisAlignItems = "CENTER";
  lockTag.primaryAxisAlignItems = "CENTER";
  text(lockTag, "🔐 操作系统凭据库加密", 11, "Regular", C.textSecondary);

  // 紧凑双列/单列输入
  fieldRow(card, "接口 Base URL", "https://api.openai.com/v1", 808, "https://api.openai.com/v1");
  
  // API Key 输入行（内嵌粘贴与显隐）
  const keyField = stack(card, "API Key 输入", 808, "VERTICAL", 6);
  text(keyField, "API Key 凭据", 12, "Bold", C.textSecondary);
  const keyInput = box(keyField, "Key Box", 808, 38, C.inputBg, 8);
  keyInput.layoutMode = "HORIZONTAL";
  keyInput.counterAxisAlignItems = "CENTER";
  keyInput.paddingLeft = 12;
  keyInput.paddingRight = 8;
  outlined(keyInput, C.borderSubtle);
  text(keyInput, "sk-proj-••••••••••••••••••••••••••••••••••••••••", 13, "Regular", C.textPrimary);
  const keySpacer = box(keyInput, "Spacer", 340, 10, null);
  button(keyInput, "粘贴", "secondary", 26, 44);
  button(keyInput, "显示", "secondary", 26, 44);

  // 可用模型与主动作行
  const bottomRow = stack(card, "底部动作行", 808, "HORIZONTAL", 16);
  bottomRow.counterAxisAlignItems = "CENTER";
  
  button(bottomRow, "保存并测试连接", "primary", 38, 140); // 核心 Primary 动作！
  button(bottomRow, "一键拉取模型列表", "secondary", 38, 130);
  
  const bSpacer = box(bottomRow, "Spacer", 240, 10, null);
  text(bottomRow, "● 当前连接已生效 · 响应延迟 142ms", 12, "Regular", C.statusGreen);

  // 模型胶囊流（已拉取的模型直接点击设为主用）
  const modelSec = stack(main, "已拉取模型流", 856, "VERTICAL", 8);
  text(modelSec, "已就绪模型列表（点击设为默认主力模型）", 12, "Bold", C.textMuted);
  const pillRow = stack(modelSec, "Pills", 856, "HORIZONTAL", 8);
  button(pillRow, "★ gpt-4o (当前主用)", "active-tab", 30);
  button(pillRow, "gpt-4o-mini", "secondary", 30);
  button(pillRow, "o1-preview", "secondary", 30);
  button(pillRow, "o1-mini", "secondary", 30);
  button(pillRow, "+ 手动添加模型", "secondary", 30);
}

// ==========================================
// 画板 3：四大病灶修复对照白皮书
// ==========================================
function buildRationaleScreen(page, x) {
  const doc = box(page, "03 · 模型接入重构说明与 Token 对照白皮书", 680, 720, C.windowBg, 16);
  doc.x = x;
  doc.y = 40;
  doc.layoutMode = "VERTICAL";
  doc.paddingTop = 28;
  doc.paddingLeft = 32;
  doc.paddingRight = 32;
  doc.itemSpacing = 18;
  outlined(doc, C.borderSubtle);

  text(doc, "重构价值与设计变更白皮书", 20, "Bold", C.textPrimary);
  text(
    doc,
    "彻底纠正旧版「内容过载、提示零碎、按钮无级、心智混乱」问题，对齐 Apple 级克制设计。",
    12,
    "Regular",
    C.textMuted
  );

  const points = [
    {
      title: "1. 清除零碎免责碎碎念 (Noise Elimination)",
      desc: "旧版在每个输入框下方堆砌长篇免责（“硬件级安全加密...”、“状态: WebView2 资源...”），新版收敛为右上角紧凑微标与 ⓘ Tooltip，大幅提升信噪比。",
    },
    {
      title: "2. 确立清晰的三级按钮阶梯 (Visual Hierarchy)",
      desc: "旧版所有按钮皆为扁平深灰，新版严格划分为：Primary 品牌强调色 (#21a673，连接/保存) → Secondary 轮廓 (测试/新建) → Ghost 次级 (断开/重置)。",
    },
    {
      title: "3. 剥离错位的「浏览器后端」 (Architecture Cleanliness)",
      desc: "浏览器后端属于系统运行环境，此前被错误硬编码塞入 Codex 卡片内。新版将其独立归位至「网络与代理」，使模型接入仅专注于模型本身。",
    },
    {
      title: "4. 官方服务商平权与一键预设 (1-Click Flow)",
      desc: "将旧版被孤立在页面最底部的 Google Gemini 与 OpenAI、Claude、DeepSeek 并列为官方预设，一键回填 Base URL 与协议，省去用户繁琐的手填步骤。",
    },
  ];

  for (const p of points) {
    const item = box(doc, "Point", 616, 85, C.cardBg, 8);
    item.layoutMode = "VERTICAL";
    item.paddingLeft = 16;
    item.paddingRight = 16;
    item.paddingTop = 10;
    item.itemSpacing = 6;
    outlined(item, C.borderSubtle);
    text(item, p.title, 13, "Bold", C.accentPrimary);
    text(item, p.desc, 12, "Regular", C.textSecondary, 584);
  }

  // Token 对照
  const tokenBox = box(doc, "Token Box", 616, 120, C.codeBg, 8);
  tokenBox.layoutMode = "VERTICAL";
  tokenBox.paddingTop = 12;
  tokenBox.paddingLeft = 16;
  tokenBox.paddingRight = 16;
  tokenBox.itemSpacing = 4;
  outlined(tokenBox, C.borderSubtle);
  text(tokenBox, "三层 Token 映射关系：", 12, "Bold", C.textPrimary);
  text(tokenBox, "• Primary Button : var(--kk-button-primary-bg) → #21a673", 11, "Regular", C.textSecondary);
  text(tokenBox, "• Card Surface   : var(--kk-surface-container)  → #1c1c22", 11, "Regular", C.textSecondary);
  text(tokenBox, "• Window Frame   : var(--kk-surface-window)     → #16161a", 11, "Regular", C.textSecondary);
  text(tokenBox, "• Status Active  : var(--kk-status-online)      → #22c55e", 11, "Regular", C.textSecondary);
}

// ==========================================
// 主执行函数
// ==========================================
async function main() {
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
  ]);

  let page = figma.root.children.find((p) => p.name === PAGE_NAME);
  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
    created.push(page.id);
  } else {
    // 清理旧内容重新生成
    for (const child of [...page.children]) {
      child.remove();
    }
  }

  await figma.setCurrentPageAsync(page);

  // 依次生成三个核心画板
  buildCliScreen(page, 40);
  buildOfficialApiScreen(page, 1200);
  buildRationaleScreen(page, 2360);

  figma.currentPage.selection = page.children;
  figma.viewport.scrollAndZoomIntoView(page.children);

  figma.closePlugin(
    "🎉 模型接入 UI 重构修稿已成功生成！已为您呈现『CLI 直连极简版』、『官方 API 1-Click 向导版』及『设计对比说明』。"
  );
}

main().catch((err) => {
  figma.closePlugin("生成失败：" + String(err.message || err));
});
