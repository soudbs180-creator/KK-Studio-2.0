export interface SearchableModel {
  label: string;
  terms?: string[];
}
const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/\s*:\s*/g, ":")
    .replace(/[·_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  return rows[a.length][b.length];
}
function score(query: string, fields: string[]): number {
  if (fields.includes(query)) return 0;
  const tokens = fields.flatMap((field) => field.split(" "));
  // Never fuzz numeric versions, resolutions, dimensions or ratio orientation.
  if (/\d/.test(query)) return tokens.includes(query) ? 1 : Infinity;
  if (fields.some((field) => field.includes(query))) return 1;
  if (query.length < 3 || !/^[a-z]+$/.test(query)) return Infinity;
  for (const token of tokens.filter(
    (token) => /^[a-z]+$/.test(token) && token.length <= 60,
  )) {
    if (
      query.length >= 4 &&
      Math.abs(query.length - token.length) <= 2 &&
      distance(query, token) <= (query.length >= 8 ? 2 : 1)
    )
      return 3;
    let at = 0;
    for (const char of token) if (char === query[at]) at++;
    if (at === query.length && query.length >= Math.ceil(token.length / 2))
      return 4;
  }
  return Infinity;
}
export function searchModels<T extends SearchableModel>(
  items: T[],
  input: string,
): { item: T; fuzzy: boolean; score: number }[] {
  const query = normalize(input).slice(0, 120);
  if (!query) return items.map((item) => ({ item, fuzzy: false, score: 0 }));
  return items
    .flatMap((item) => {
      const fields = [item.label, ...(item.terms ?? [])].map(normalize);
      const ranks = query.split(" ").map((token) => score(token, fields));
      if (ranks.some((rank) => !Number.isFinite(rank))) return [];
      return [
        {
          item,
          fuzzy: ranks.some((rank) => rank >= 3),
          score: fields.includes(query)
            ? 0
            : ranks.reduce((a, b) => a + b, 0) + 1,
        },
      ];
    })
    .sort((a, b) => a.score - b.score);
}
