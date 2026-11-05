export interface NumberedReference {
  index: number;
  raw: string;
  startIndex: number;
  endIndex: number;
}

export function extractNumberedReferences(prompt: string): NumberedReference[] {
  return [...prompt.matchAll(/@参考\s*(\d+)|\{\{ref\s*(\d+)\}\}/gu)].map(
    (match) => ({
      index: Number(match[1] ?? match[2]),
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    }),
  );
}

export function parsePromptMentions(
  prompt: string,
  assetMap: Readonly<Record<string, string>>,
  attachmentAssets: Readonly<Record<string, string>> = {},
): {
  compiledPrompt: string;
  mentions: Array<{ index: number; assetId: string }>;
} {
  const tokens = extractNumberedReferences(prompt);
  const mentions = tokens.map((token) => {
    const key = String(token.index);
    const assetId = Object.hasOwn(assetMap, key) ? assetMap[key] : undefined;
    if (
      !Number.isSafeInteger(token.index) ||
      token.index < 1 ||
      !assetId?.trim()
    )
      throw new Error(
        `参考 ${token.index} 不存在或未附加原件，请重新选择后提交。`,
      );
    return { index: token.index, assetId };
  });
  let compiledPrompt = prompt;
  for (let i = tokens.length - 1; i >= 0; i--)
    compiledPrompt =
      compiledPrompt.slice(0, tokens[i].startIndex) +
      `[RefAsset: ${mentions[i].assetId}]` +
      compiledPrompt.slice(tokens[i].endIndex);
  compiledPrompt = compiledPrompt.replace(
    /@\{mention:([^|}]+)\|([^|}]+)\|([^|}]+)\}/gu,
    (_raw, targetId: string) => {
      const values = Object.values(assetMap);
      const assetId = Object.hasOwn(attachmentAssets, targetId)
        ? attachmentAssets[targetId]
        : targetId;
      const index = values.indexOf(assetId);
      if (index < 0)
        throw new Error(`参考 ${targetId} 已移除，请重新选择原件。`);
      mentions.push({ index: index + 1, assetId });
      return `[RefAsset: ${assetId}]`;
    },
  );
  return { compiledPrompt, mentions };
}
