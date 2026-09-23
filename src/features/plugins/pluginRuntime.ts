/**
 * 插件运行时桥：把宿主 React/事件总线/injectCSS 注入到全局，
 * 供插件 bundle（经 sdk 惰性读取 globalThis.InfiniteCanvasRuntime）在渲染时使用。
 */

import type { PluginRuntime } from "./pluginTypes.ts";

declare global {
  var InfiniteCanvasRuntime: PluginRuntime | undefined;
}

let pending: PluginRuntime | null = null;

export function setPluginRuntime(runtime: PluginRuntime): void {
  pending = runtime;
  globalThis.InfiniteCanvasRuntime = runtime;
}

export function getPluginRuntime(): PluginRuntime {
  const runtime = globalThis.InfiniteCanvasRuntime ?? pending;
  if (!runtime) {
    throw new Error(
      "[plugins] 插件运行时未就绪：请先在应用中 setPluginRuntime()",
    );
  }
  return runtime;
}

/** 注入/替换一段样式，返回移除函数；key 相同时覆盖旧样式。 */
export function injectPluginCss(css: string, key = "plugin"): () => void {
  if (typeof document === "undefined") return () => undefined; // Node/SSR 无 DOM
  const element = document.createElement("style");
  element.setAttribute("data-plugin-css", key);
  element.textContent = css;
  document.head.appendChild(element);
  return () => element.remove();
}

/** 把 CSS 变量解析为插件主题令牌（跟随宿主明暗主题）。 */
export function readPluginTheme(): import("./pluginTypes.ts").PluginTheme {
  const get = (name: string): string =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    "#000000";
  return {
    canvas: {
      background: get("--bg-app"),
      dot: get("--border-subtle"),
      line: get("--border-subtle"),
      selectionStroke: get("--bg-accent"),
      selectionFill: "transparent",
    },
    node: {
      label: get("--text-secondary"),
      fill: get("--bg-card"),
      panel: get("--bg-surface"),
      stroke: get("--border-default"),
      activeStroke: get("--bg-accent"),
      placeholder: get("--text-tertiary"),
      text: get("--text-primary"),
      muted: get("--text-secondary"),
      faint: get("--text-tertiary"),
    },
    toolbar: {
      panel: get("--bg-surface"),
      border: get("--border-default"),
      item: get("--text-secondary"),
      itemHover: get("--text-primary"),
      activeBg: get("--bg-accent"),
      activeText: get("--text-primary"),
    },
  };
}
