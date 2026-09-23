import { readFileSync } from "node:fs";

export const ACCENTS = [
  "default",
  "blue",
  "green",
  "yellow",
  "pink",
  "orange",
  "purple",
  "white",
] as const;

export function cssRgb(hex: string): string {
  const value = hex.slice(1);
  const full =
    value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  return `rgb(${full
    .match(/../g)!
    .map((c) => parseInt(c, 16))
    .join(", ")})`;
}

export function contrast(a: string, b: string): number {
  function luminance(color: string): number {
    let channels: number[];
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      channels = (
        hex.length === 3 ? [...hex].map((c) => c + c) : hex.match(/../g)!
      ).map((c) => parseInt(c, 16));
    } else {
      channels = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    }
    return channels
      .map((value) => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      })
      .reduce(
        (sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i],
        0,
      );
  }
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// Read the shipped token owners, not a duplicate palette maintained by tests.
export function themeTokens(theme: string, accent: string) {
  const css = ["global.css", "ui-tokens.css"]
    .map((file) =>
      readFileSync(
        new URL(`../../src/styles/${file}`, import.meta.url),
        "utf8",
      ),
    )
    .join("\n");
  const tokens: Record<string, string> = {};
  for (const [, selector, body] of css.matchAll(/(:root[^{}]*)\{([^{}]*)\}/g)) {
    const themeMatch = selector.match(/\[data-theme="([^"]+)"\]/);
    const accentMatch = selector.match(/\[data-accent="([^"]+)"\]/);
    if (themeMatch && themeMatch[1] !== theme) continue;
    if (accentMatch && accentMatch[1] !== accent) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
      tokens[name] = value.trim();
  }
  function resolve(name: string, seen = new Set<string>()): string {
    if (!tokens[name]) throw new Error(`Missing design token ${name}`);
    if (seen.has(name)) throw new Error(`Cyclic token ${name}`);
    seen.add(name);
    const value = tokens[name];
    const reference = value.match(/^var\((--[\w-]+)\)$/);
    return reference ? resolve(reference[1], seen) : value;
  }
  return resolve;
}
