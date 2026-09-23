import { imageSizeOptions, type CatalogModel } from "./modelCatalog.ts";
/** Suffix parsing describes existing route names; it never invents request parameters. */
export function modelDisplay(model: CatalogModel) {
  let family = model.id;
  const suffixes: string[] = [];
  let match: RegExpMatchArray | null;
  while ((match = family.match(/[-_](1k|2k|4k|8k|low|medium|high)$/i))) {
    const token = match[1];
    suffixes.unshift(
      /\dk/i.test(token)
        ? token.toUpperCase()
        : token[0].toUpperCase() + token.slice(1).toLowerCase(),
    );
    family = family.slice(0, -match[0].length);
  }
  return {
    family: model.family || family || model.id,
    variant: model.variant || suffixes.join(" · "),
  };
}
export function groupCatalogModels(models: CatalogModel[]) {
  const groups = new Map<string, { name: string; models: CatalogModel[] }>();
  for (const model of models) {
    const name = modelDisplay(model).family;
    const key = JSON.stringify([name, model.kind]);
    const group = groups.get(key) ?? { name, models: [] };
    group.models.push(model);
    groups.set(key, group);
  }
  return [...groups.values()];
}
export function modelSearchTerms(model: CatalogModel): string[] {
  const display = modelDisplay(model);
  return [
    model.id,
    display.family,
    display.variant,
    ...(model.aliases ?? []),
    ...imageSizeOptions(model).flatMap((option) => [option.size, option.ratio]),
  ];
}
