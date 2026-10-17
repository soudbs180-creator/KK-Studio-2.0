/** Phone geometry follows the pinned mobile reference; targets remain platform-owned. */
export const radii = {
  none: 0,
  control: 8,
  menu: 12,
  panel: 32,
  card: 16,
  composer: 32,
} as const;
export const spacing = {
  page: 16,
  section: 24,
  content: 12,
  controls: 8,
} as const;
export const typography = {
  body: { fontSize: 16, lineHeight: 24 },
  supporting: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
  title: { fontSize: 20, lineHeight: 26 },
  hero: { fontSize: 28, lineHeight: 36 },
} as const;
