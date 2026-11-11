// Single implementation of the Figma variable name -> CSS custom property
// mapping (docs/FIGMA-SYNC.md D-TOKEN-03). Never translate names by hand.

export const CSS_PREFIX = "--kk-";
export const TIER_COLLECTIONS = Object.freeze([
  "primitive",
  "semantic",
  "component",
]);
export const STATE_SUFFIXES = Object.freeze([
  "hover",
  "active",
  "selected",
  "disabled",
  "focus",
  "loading",
  "error",
  "success",
]);

function slugSegment(segment) {
  return segment
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Map a Figma variable name (without its collection) to a CSS variable.
 * `button/primary/bg/hover` -> `--kk-button-primary-bg-hover`.
 * Throws when the name cannot form a valid ASCII token name.
 */
export function figmaToCssVar(variableName) {
  const segments = String(variableName)
    .split("/")
    .map(slugSegment)
    .filter(Boolean);
  const slug = segments.join("-");
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(
      `Figma variable "${variableName}" cannot map to a CSS token; use lowercase ASCII segments`,
    );
  return `${CSS_PREFIX}${slug}`;
}

export function normalizeCollection(name) {
  return slugSegment(String(name ?? ""));
}

/** Return the tier index (1-3) for a known collection, otherwise null. */
export function collectionTier(name) {
  const index = TIER_COLLECTIONS.indexOf(normalizeCollection(name));
  return index === -1 ? null : index + 1;
}
