/**
 * uiAestheticGovernance.ts
 *
 * Automated Aesthetic Governance Engine absorbing unslop's 9-pass redline review.
 * Pure Hexagonal Domain Logic: Zero DOM / React / Tauri dependencies.
 */

export type RedlinePass =
  | "spacing"
  | "color"
  | "icons"
  | "copy"
  | "typography"
  | "layout"
  | "details"
  | "visuals"
  | "motion";

export type SlopSeverity = "violation" | "warning" | "suggestion";

export interface SlopFinding {
  pass: RedlinePass;
  ruleId: string;
  ruleName: string;
  severity: SlopSeverity;
  message: string;
  property?: string;
  actualValue?: unknown;
  recommendedValue?: string;
}

export interface AestheticValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  findings: SlopFinding[];
  passesChecked: RedlinePass[];
}

export type StyleProperties = Record<string, string | number | undefined>;

// ---------------------------------------------------------------------------
// Pass 1: Spacing (Strict 4px grid)
// ---------------------------------------------------------------------------
export function validateSpacingValue(
  value: string | number,
  propertyName = "spacing",
): SlopFinding | null {
  let num = 0;
  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string") {
    const match = value.trim().match(/^(-?\d+(\.\d+)?)px$/);
    if (!match) return null;
    num = parseFloat(match[1]);
  }
  const abs = Math.abs(num);
  if (abs === 0) return null;
  if (abs % 4 !== 0) {
    if (abs % 2 === 0) {
      return {
        pass: "spacing",
        ruleId: "SP-01",
        ruleName: "4px Grid Rhythm (Nudge Warning)",
        severity: "warning",
        message: `${propertyName} 值 ${value} 是 2px 微调，建议对齐 4px 标准网格`,
        property: propertyName,
        actualValue: value,
        recommendedValue: `${Math.round(num / 4) * 4}px`,
      };
    }
    return {
      pass: "spacing",
      ruleId: "SP-01",
      ruleName: "4px Grid Rhythm Violation",
      severity: "violation",
      message: `${propertyName} 值 ${value} 偏离 4px 节奏`,
      property: propertyName,
      actualValue: value,
      recommendedValue: `${Math.round(num / 4) * 4}px`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pass 2: Color (Quiet Chrome & WCAG Contrast)
// ---------------------------------------------------------------------------
const SLOP_GRADIENT_REGEX =
  /(linear|radial|conic)-gradient\([^)]*(purple|violet|pink|#8b5cf6|#ec4899|#a855f7)[^)]*(blue|indigo|#3b82f6|#6366f1)[^)]*\)/i;
const GLOW_SHADOW_REGEX =
  /0\s+0\s+(\d+)px\s+(rgba?\([^)]+\)|#([0-9a-f]{6}|[0-9a-f]{3}))/i;

export function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function calculateRelativeLuminance(
  rgb: [number, number, number],
): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(c1Hex: string, c2Hex: string): number {
  const l1 = calculateRelativeLuminance(parseHexColor(c1Hex));
  const l2 = calculateRelativeLuminance(parseHexColor(c2Hex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function validateColorStyle(
  property: string,
  value: string,
): SlopFinding | null {
  if (SLOP_GRADIENT_REGEX.test(value)) {
    return {
      pass: "color",
      ruleId: "COL-01",
      ruleName: "Slop Gradient Detected",
      severity: "violation",
      message: `${property} 包含紫蓝/粉紫 AI 风格渐变，应使用单一中性色阶与克制强调色`,
      property,
      actualValue: value,
      recommendedValue: "var(--kk-bg-card)",
    };
  }
  if (property.toLowerCase().includes("shadow")) {
    const match = value.match(GLOW_SHADOW_REGEX);
    if (match) {
      const blur = parseInt(match[1], 10);
      if (blur >= 10) {
        return {
          pass: "color",
          ruleId: "COL-01",
          ruleName: "Colored Glow Shadow Detected",
          severity: "violation",
          message: `${property} 包含高斯发光阴影，违反 Quiet Chrome 规范`,
          property,
          actualValue: value,
          recommendedValue: "none",
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pass 3: Icons & Emoji
// ---------------------------------------------------------------------------
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

export function validateIconCopy(text: string): SlopFinding | null {
  if (EMOJI_REGEX.test(text)) {
    return {
      pass: "icons",
      ruleId: "ICO-01",
      ruleName: "Emoji as UI Icon/Decoration",
      severity: "violation",
      message: `界面文本/按钮中包含 Emoji 装饰，必须替换为标准 Lucide 矢量图标或纯文本`,
      actualValue: text,
      recommendedValue: text.replace(EMOJI_REGEX, "").trim(),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pass 4: Copy (Plain language, No shouting)
// ---------------------------------------------------------------------------
const EXCLAMATION_REGEX = /[!！]/;
const GREETING_REGEX = /^(欢迎回来|welcome back|hi,|hello)/i;
const HYPE_WORDS = [
  "supercharge",
  "seamless",
  "unlock",
  "magic",
  "revolutionize",
  "game-changing",
  "ai-powered",
  "黑科技",
  "极致赋能",
];

export function validateCopyText(
  text: string,
  isButtonOrLabel = false,
): SlopFinding[] {
  const findings: SlopFinding[] = [];
  if (EXCLAMATION_REGEX.test(text)) {
    findings.push({
      pass: "copy",
      ruleId: "CPY-01",
      ruleName: "Exclamation in Interface",
      severity: "violation",
      message: `界面文本包含感叹号，应采用平实、确切的陈述句`,
      actualValue: text,
      recommendedValue: text.replace(/[!！]/g, ""),
    });
  }
  if (GREETING_REGEX.test(text)) {
    findings.push({
      pass: "copy",
      ruleId: "CPY-02",
      ruleName: "Greeting Headline Slop",
      severity: "warning",
      message: `标题应直接指明上下文场景或周期，而非模板化问候语`,
      actualValue: text,
    });
  }
  const lower = text.toLowerCase();
  for (const word of HYPE_WORDS) {
    if (lower.includes(word)) {
      findings.push({
        pass: "copy",
        ruleId: "CPY-03",
        ruleName: "AI Hype Buzzword Detected",
        severity: "violation",
        message: `包含夸张营销词汇 "${word}"，应说明功能所创造的实际事实`,
        actualValue: text,
      });
    }
  }
  if (isButtonOrLabel && /[.。.]$/.test(text.trim())) {
    findings.push({
      pass: "copy",
      ruleId: "CPY-04",
      ruleName: "Trailing Period on Label",
      severity: "warning",
      message: `按钮或操作标签末尾禁止带有句号`,
      actualValue: text,
      recommendedValue: text.trim().replace(/[.。.]$/, ""),
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Pass 5: Typography (Restrained Weights & Dark Compensation)
// ---------------------------------------------------------------------------
export function validateTypographyWeight(
  weight: number | string,
): SlopFinding | null {
  const w = typeof weight === "string" ? parseInt(weight, 10) : weight;
  if (w > 700) {
    return {
      pass: "typography",
      ruleId: "TYP-01",
      ruleName: "Weight Exceeds Figma Typography Scale",
      severity: "violation",
      message: `字重 ${weight} 超过 01 字阶最高基准 700；按文字角色使用 400/500/700，深色主题对应 360/460/660`,
      actualValue: weight,
      recommendedValue: "700",
    };
  }
  return null;
}

export function getDarkThemeCompensatedWeight(nominalWeight: number): number {
  if (nominalWeight >= 700) return 660;
  if (nominalWeight >= 500) return 460;
  if (nominalWeight >= 400) return 360;
  return nominalWeight;
}

// ---------------------------------------------------------------------------
// Pass 6: Layout & Mobile Viewport Boundary (Figma 597:67456 / 91:11)
// ---------------------------------------------------------------------------
export function validateViewportLayout(
  viewportWidth: number,
  activeComponents: string[],
): SlopFinding[] {
  const findings: SlopFinding[] = [];
  if (viewportWidth <= 767) {
    const prohibited = [
      "CanvasScreen",
      "CanvasNodeEditor",
      "CanvasEdgeEditor",
      "CanvasViewportEditor",
      "CanvasEdges",
      "InfiniteCanvas",
      "Minimap",
    ];
    for (const comp of activeComponents) {
      if (prohibited.includes(comp)) {
        findings.push({
          pass: "layout",
          ruleId: "LAY-01",
          ruleName: "Mobile Canvas Violation (Figma 597:67456 / 91:11)",
          severity: "violation",
          message: `视口宽 ${viewportWidth}px (<=767px) 手机端严禁渲染 ${comp}。手机端严格限定为单列会话创作界面`,
          actualValue: comp,
          recommendedValue: "ChatScreen",
        });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Pass 7: Details & Concentric Radius Law
// ---------------------------------------------------------------------------
export function validateConcentricRadius(
  outerRadius: number,
  innerRadius: number,
  padding: number,
): SlopFinding | null {
  const expectedInner = outerRadius - padding;
  if (expectedInner >= 4 && innerRadius !== expectedInner) {
    return {
      pass: "details",
      ruleId: "DET-01",
      ruleName: "Concentric Radius Law Violation",
      severity: "warning",
      message: `同心圆角不匹配：外圆角 (${outerRadius}) - 边距 (${padding}) 应等于内容圆角 (${expectedInner})，当前为 ${innerRadius}`,
      actualValue: innerRadius,
      recommendedValue: `${expectedInner}px`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pass 8: Visuals
// ---------------------------------------------------------------------------
const VISUAL_SLOP_REGEX =
  /(holographic-orb|glossy-cube|neon-glow-mesh|stock-galaxy)/i;

export function validateVisualAsset(
  assetIdentifier: string,
): SlopFinding | null {
  if (VISUAL_SLOP_REGEX.test(assetIdentifier)) {
    return {
      pass: "visuals",
      ruleId: "VIS-01",
      ruleName: "Decorative Visual Slop Detected",
      severity: "violation",
      message: `检测到装饰性噱头资产 "${assetIdentifier}"，产品界面应展示真实工作区内容`,
      actualValue: assetIdentifier,
      recommendedValue: "真实工作流或资产预览",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pass 9: Motion (Safe transitions & no looping slop)
// ---------------------------------------------------------------------------
const UNSAFE_MOTION_PROPS = [
  "width",
  "height",
  "top",
  "left",
  "margin",
  "padding",
  "filter",
];
const LOOPING_SLOP_ANIMATIONS = [
  "animate-pulse",
  "animate-ping",
  "spin-glow",
  "breathe",
];

export function validateMotionProperty(property: string): SlopFinding | null {
  if (UNSAFE_MOTION_PROPS.includes(property.toLowerCase())) {
    return {
      pass: "motion",
      ruleId: "MOT-04",
      ruleName: "Unsafe Layout Property Animation",
      severity: "violation",
      message: `禁止对布局属性 "${property}" 设置过渡动效；应改用 transform 与 opacity`,
      actualValue: property,
      recommendedValue: "transform, opacity",
    };
  }
  return null;
}

export function validateAnimationName(
  animationName: string,
): SlopFinding | null {
  for (const slop of LOOPING_SLOP_ANIMATIONS) {
    if (animationName.toLowerCase().includes(slop)) {
      return {
        pass: "motion",
        ruleId: "MOT-03",
        ruleName: "Looping Motion Slop Detected",
        severity: "violation",
        message: `禁止在界面中使用 "${animationName}" 循环呼吸/脉冲动效，干扰用户注意力`,
        actualValue: animationName,
        recommendedValue: "none",
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Aggregate Evaluator
// ---------------------------------------------------------------------------
export function evaluateStyleDeclaration(
  styles: StyleProperties,
): AestheticValidationResult {
  const findings: SlopFinding[] = [];
  const passes: Set<RedlinePass> = new Set();

  for (const [prop, val] of Object.entries(styles)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val);

    // Spacing
    if (
      [
        "margin",
        "marginTop",
        "marginBottom",
        "marginLeft",
        "marginRight",
        "padding",
        "paddingTop",
        "paddingBottom",
        "paddingLeft",
        "paddingRight",
        "gap",
      ].includes(prop)
    ) {
      passes.add("spacing");
      const finding = validateSpacingValue(strVal, prop);
      if (finding) findings.push(finding);
    }

    // Color & Shadows
    if (
      [
        "background",
        "backgroundImage",
        "boxShadow",
        "border",
        "borderColor",
      ].includes(prop)
    ) {
      passes.add("color");
      const finding = validateColorStyle(prop, strVal);
      if (finding) findings.push(finding);
    }

    // Typography
    if (prop === "fontWeight") {
      passes.add("typography");
      const finding = validateTypographyWeight(strVal);
      if (finding) findings.push(finding);
    }

    // Motion
    if (["transitionProperty", "transition"].includes(prop)) {
      passes.add("motion");
      for (const unsafe of UNSAFE_MOTION_PROPS) {
        if (strVal.includes(unsafe)) {
          const finding = validateMotionProperty(unsafe);
          if (finding) findings.push(finding);
        }
      }
    }
  }

  const score = Math.max(
    0,
    100 -
      findings.filter((f) => f.severity === "violation").length * 20 -
      findings.filter((f) => f.severity === "warning").length * 5,
  );

  return {
    valid: findings.every((f) => f.severity !== "violation"),
    score,
    findings,
    passesChecked: Array.from(passes),
  };
}
