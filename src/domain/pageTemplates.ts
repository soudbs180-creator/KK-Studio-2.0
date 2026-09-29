export const PAGE_TEMPLATE_KEYS = [
  "list",
  "grid",
  "detail",
  "timeline",
  "gallery",
] as const;

export type PageTemplateKey = (typeof PAGE_TEMPLATE_KEYS)[number];

export type ContentProfile = {
  workDisplay?: boolean;
  media?: boolean;
  batchSelect?: boolean;
  ordered?: boolean;
  process?: boolean;
  history?: boolean;
  sortable?: boolean;
  singleObject?: boolean;
  fields?: number;
  count?: number;
};

export type PageTemplateDefinition = {
  id: PageTemplateKey;
  label: string;
  purpose: string;
  layout: {
    structure: readonly string[];
    density: "comfortable" | "standard" | "compact";
  };
  components: readonly string[];
  interactions: readonly string[];
  visual: {
    gapToken: string;
    paddingToken: string;
    radiusToken: string;
    textToken: string;
    motion: "surface-enter" | "panel-enter" | "none";
  };
  states: readonly ["empty", "loading", "error"];
  nesting: "root" | "detail-panel";
};

export const PAGE_TEMPLATES: Readonly<
  Record<PageTemplateKey, PageTemplateDefinition>
> = Object.freeze({
  list: {
    id: "list",
    label: "列表",
    purpose: "字段规整、需要排序或快速扫描的大量条目。",
    layout: { structure: ["page-shell", "toolbar", "list-table"], density: "compact" },
    components: ["search", "filter", "sortable-header", "list-row", "row-actions"],
    interactions: ["sort-cycle", "row-select", "keyboard-navigation", "row-actions-always-visible"],
    visual: {
      gapToken: "--kk-space-4",
      paddingToken: "--kk-space-2",
      radiusToken: "--kk-radius-control",
      textToken: "--kk-font-body",
      motion: "surface-enter",
    },
    states: ["empty", "loading", "error"],
    nesting: "root",
  },
  grid: {
    id: "grid",
    label: "卡片网格",
    purpose: "带标题、描述和状态的工作、项目、Skill、模板展示。",
    layout: { structure: ["page-shell", "toolbar", "responsive-card-grid"], density: "comfortable" },
    components: ["search", "filter", "card", "status-badge", "card-action"],
    interactions: ["card-open-detail", "card-selection", "keyboard-open", "inner-action-stop-propagation"],
    visual: {
      gapToken: "--kk-space-4",
      paddingToken: "--kk-space-3",
      radiusToken: "--kk-radius-control",
      textToken: "--kk-font-body",
      motion: "surface-enter",
    },
    states: ["empty", "loading", "error"],
    nesting: "root",
  },
  detail: {
    id: "detail",
    label: "详情",
    purpose: "单个项目、任务、资产或工作结果的完整信息。",
    layout: { structure: ["page-shell", "detail-hero", "metadata", "action-bar"], density: "comfortable" },
    components: ["back", "hero", "metadata-list", "inline-edit", "action-bar"],
    interactions: ["back", "inline-edit", "primary-action", "danger-action-at-end"],
    visual: {
      gapToken: "--kk-space-4",
      paddingToken: "--kk-space-4",
      radiusToken: "--kk-radius-panel",
      textToken: "--kk-font-body",
      motion: "panel-enter",
    },
    states: ["empty", "loading", "error"],
    nesting: "detail-panel",
  },
  timeline: {
    id: "timeline",
    label: "时间线",
    purpose: "任务执行、版本记录或审批流程等有明确先后关系的内容。",
    layout: { structure: ["page-shell", "timeline-axis", "timeline-step-list"], density: "comfortable" },
    components: ["axis", "step", "step-status", "step-expander", "timestamp"],
    interactions: ["expand-step", "scroll-to-active", "keyboard-expand"],
    visual: {
      gapToken: "--kk-space-4",
      paddingToken: "--kk-space-3",
      radiusToken: "--kk-radius-control",
      textToken: "--kk-font-body",
      motion: "surface-enter",
    },
    states: ["empty", "loading", "error"],
    nesting: "root",
  },
  gallery: {
    id: "gallery",
    label: "画廊",
    purpose: "图片或视频成果的批量扫视、挑选和预览。",
    layout: { structure: ["page-shell", "toolbar", "media-grid", "lightbox"], density: "comfortable" },
    components: ["media-thumb", "source-badge", "selection-ring", "hover-actions", "lightbox"],
    interactions: ["single-select", "multi-select", "range-select", "open-lightbox", "arrow-key-navigation"],
    visual: {
      gapToken: "--kk-space-3",
      paddingToken: "--kk-space-1",
      radiusToken: "--kk-radius-sm",
      textToken: "--kk-font-caption",
      motion: "surface-enter",
    },
    states: ["empty", "loading", "error"],
    nesting: "root",
  },
});

export function getPageTemplate(key: PageTemplateKey): PageTemplateDefinition {
  return PAGE_TEMPLATES[key];
}

export function selectPageTemplate(profile: ContentProfile): PageTemplateKey {
  if (profile.workDisplay) return "grid";
  if (profile.ordered && (profile.process || profile.history)) return "timeline";
  if (profile.singleObject) return "detail";
  if (profile.sortable || (profile.count ?? 0) > 50) return "list";
  if (profile.media && (profile.batchSelect || (profile.count ?? 0) > 12)) return "gallery";
  return "grid";
}

export function canComposePageTemplates(
  primary: PageTemplateKey,
  nested: readonly PageTemplateKey[],
): boolean {
  if (nested.length === 0) return true;
  if (nested.some((key) => key === primary)) return false;
  if (primary !== "grid" && primary !== "gallery") return false;
  return nested.every((key) => key === "detail");
}

