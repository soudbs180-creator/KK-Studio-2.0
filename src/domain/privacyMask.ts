/**
 * In-memory bidirectional privacy mask.
 * The same secret always maps to the same placeholder so prompt caches stay valid.
 * The lookup table is not serialized.
 */

export interface PrivacyAudit {
  readonly replacements: number;
  readonly kinds: Readonly<Record<string, number>>;
}

const PATTERNS: ReadonlyArray<{ kind: string; source: RegExp }> = [
  {
    kind: "PRIVATE_KEY",
    source:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    kind: "API_KEY",
    source: /\b(?:sk|rk|ak|ghp|xox[baprs])-[A-Za-z0-9_-]{8,}\b/g,
  },
  { kind: "API_KEY", source: /\bAIza[A-Za-z0-9_-]{20,}\b/g },
  {
    kind: "TOKEN",
    source: /\b[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    kind: "EMAIL",
    source: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  { kind: "PHONE", source: /\b1[3-9]\d{9}\b/g },
];

function stamp(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(8, "0").slice(0, 8);
}

export class PrivacyMask {
  readonly #forward = new Map<string, string>();
  readonly #reverse = new Map<string, string>();
  #replacements = 0;
  readonly #kinds: Record<string, number> = {};

  mask(text: string): string {
    let next = text;
    for (const pattern of PATTERNS) {
      next = next.replace(pattern.source, (value) => {
        const existing = this.#forward.get(value);
        if (existing) return existing;
        const placeholder = `{{${pattern.kind}_${stamp(value)}}}`;
        this.#forward.set(value, placeholder);
        this.#reverse.set(placeholder, value);
        this.#replacements += 1;
        this.#kinds[pattern.kind] = (this.#kinds[pattern.kind] ?? 0) + 1;
        return placeholder;
      });
    }
    return next;
  }

  unmask(text: string): string {
    let next = text;
    for (const [placeholder, value] of this.#reverse)
      next = next.split(placeholder).join(value);
    return next;
  }

  audit(): PrivacyAudit {
    return {
      replacements: this.#replacements,
      kinds: { ...this.#kinds },
    };
  }
}
