import postcss from "postcss";

function functionEnd(value, start) {
  let depth = 1;
  let quote = "";
  for (let index = start; index < value.length; index++) {
    const char = value[index];
    if (char === "\\") {
      index++;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") depth++;
    if (char === ")" && --depth === 0) return index;
  }
  throw new Error(`Unclosed CSS var() in ${value}`);
}

function resolveValue(value, values, trail = [], ignoreMissing = false) {
  let result = "";
  let quote = "";
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "\\") {
      result += value.slice(index, index + 2);
      index++;
      continue;
    }
    if (quote) {
      result += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }
    if (!value.startsWith("var(", index)) {
      result += char;
      continue;
    }
    const end = functionEnd(value, index + 4);
    const expression = value.slice(index + 4, end);
    const comma = expression.indexOf(",");
    const name = (comma < 0 ? expression : expression.slice(0, comma)).trim();
    if (!/^--[\w-]+$/.test(name))
      throw new Error(`Invalid CSS variable ${name}`);
    if (trail.includes(name))
      throw new Error(`Cyclic CSS reference: ${[...trail, name].join(" -> ")}`);
    const fallback = comma < 0 ? undefined : expression.slice(comma + 1).trim();
    if (fallback !== undefined) resolveValue(fallback, values, trail, true);
    const referenced = values.get(name)?.value ?? fallback;
    if (referenced === undefined && !ignoreMissing)
      throw new Error(`Missing CSS reference ${name}`);
    if (referenced !== undefined)
      result += resolveValue(
        referenced,
        values,
        [...trail, name],
        ignoreMissing,
      );
    index = end;
  }
  return result.trim();
}

export function getValue(values, name) {
  const key = `--kk-${name}`;
  const raw = values.get(key)?.value;
  return raw === undefined ? undefined : resolveValue(raw, values, [key]);
}

export function parseCssScopes(css) {
  const scopes = [];
  postcss.parse(css).walk((node) => {
    if (!["rule", "atrule"].includes(node.type)) return;
    const declarations = (node.nodes ?? [])
      .filter((child) => child.type === "decl")
      .map((child) => ({
        property: child.prop,
        value: child.value,
        important: Boolean(child.important),
      }));
    if (!declarations.length) return;
    const atRules = [];
    for (
      let parent = node.type === "atrule" ? node : node.parent;
      parent;
      parent = parent.parent
    )
      if (parent.type === "atrule")
        atRules.unshift(`@${parent.name} ${parent.params}`.trim());
    scopes.push({ selector: node.selector ?? "", atRules, declarations });
  });
  return scopes;
}

function selectorConditions(selector) {
  // shortcut: resolves this repository's root/data-attribute and px-width modes, extend before adding other CSS contexts.
  const attributes = [
    ...selector.matchAll(/\[(data-[\w-]+)=["']([^"']+)["']\]/g),
  ];
  const rest = selector.replace(/\[(data-[\w-]+)=["']([^"']+)["']\]/g, "");
  if (!["", ":root", "html"].includes(rest) || (!rest && !attributes.length))
    throw new Error(
      `Unsupported token selector ${selector}; extend the CSS context resolver before adding this mode`,
    );
  return {
    attributes: attributes.map((match) => [match[1], match[2]]),
    specificity:
      attributes.length * 10 +
      (rest === ":root" ? 10 : rest === "html" ? 1 : 0),
  };
}

function mediaConditions(rule) {
  const matches = [...rule.matchAll(/\((min|max)-width:\s*(\d*\.?\d+)px\)/g)];
  const rest = rule
    .replace(/^@media\s+/, "")
    .replace(/\((min|max)-width:\s*(\d*\.?\d+)px\)/g, "")
    .replace(/\b(?:and|only|screen|all)\b/g, "")
    .trim();
  if (!rule.startsWith("@media ") || rest || !matches.length)
    throw new Error(
      `Unsupported token media condition ${rule}; extend the CSS context resolver before adding it`,
    );
  return matches.map((match) => ({
    minimum: match[1] === "min",
    width: Number(match[2]),
  }));
}

function prepareScopes(scopes) {
  return scopes.map((scope) => ({
    ...scope,
    selectors: postcss.list.comma(scope.selector).map(selectorConditions),
    media: scope.atRules.flatMap(mediaConditions),
  }));
}

function attributeStates(scopes) {
  const dimensions = new Map();
  for (const scope of scopes)
    for (const selector of scope.selectors)
      for (const [name, value] of selector.attributes) {
        if (!dimensions.has(name)) dimensions.set(name, new Set([undefined]));
        dimensions.get(name).add(value);
      }
  let states = [{}];
  for (const [name, values] of dimensions) {
    states = states.flatMap((state) =>
      [...values].map((value) => ({ ...state, [name]: value })),
    );
    if (states.length > 1024)
      throw new Error("Too many CSS token mode combinations");
  }
  return states;
}

function contextAt(scopes, attributes, width) {
  const values = new Map();
  const declarations = [];
  for (const scope of scopes) {
    if (
      scope.media.some((condition) =>
        condition.minimum ? width < condition.width : width > condition.width,
      )
    )
      continue;
    const matching = scope.selectors.filter((selector) =>
      selector.attributes.every(([name, value]) => attributes[name] === value),
    );
    if (!matching.length) continue;
    const specificity = Math.max(
      ...matching.map((selector) => selector.specificity),
    );
    declarations.push(...scope.declarations);
    for (const declaration of scope.declarations) {
      if (!declaration.property.startsWith("--")) continue;
      const previous = values.get(declaration.property);
      if (
        previous &&
        ((previous.important && !declaration.important) ||
          (previous.important === declaration.important &&
            previous.specificity > specificity))
      )
        continue;
      values.set(declaration.property, { ...declaration, specificity });
    }
  }
  return { values, declarations };
}

function validateContext({ values, declarations }) {
  for (const [name, declaration] of values)
    resolveValue(declaration.value, values, [name]);
  for (const declaration of declarations)
    if (!declaration.property.startsWith("--"))
      resolveValue(declaration.value, values);
}

export function cssContexts(scopes) {
  const prepared = prepareScopes(scopes);
  const boundaries = [
    ...new Set(
      prepared.flatMap((scope) =>
        scope.media.map((condition) => condition.width),
      ),
    ),
  ];
  const widths = [0, ...boundaries.flatMap((width) => [width, width + 0.5])];
  const checked = new Set();
  for (const attributes of attributeStates(prepared))
    for (const width of widths) {
      const context = contextAt(prepared, attributes, width);
      const signature = JSON.stringify({
        values: [...context.values].map(([key, value]) => [key, value.value]),
        declarations: context.declarations.filter(
          (entry) => !entry.property.startsWith("--"),
        ),
      });
      if (!checked.has(signature)) {
        validateContext(context);
        checked.add(signature);
      }
    }
  const ordinary = prepared.filter((scope) => !scope.media.length);
  const base = contextAt(ordinary, {}, 0).values;
  if (!base.size)
    throw new Error("tokens.css must define :root custom properties");
  return {
    base,
    light: contextAt(ordinary, { "data-theme": "light" }, 0).values,
  };
}
