export interface ConversationShareInput {
  title: string;
  messages: ReadonlyArray<{ role: string; content: string }>;
}
export interface ConversationDownloadEnvironment {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  clickDownload(url: string, filename: string): void;
  scheduleRelease(callback: () => void): void;
}
const visibleMessages = (input: ConversationShareInput) =>
  input.messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.content.trim(),
  );

function replaceControls(value: string, replacement: string): string {
  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? replacement : character;
    })
    .join("");
}

export function formatConversationMarkdown(
  input: ConversationShareInput,
): string {
  const title = replaceControls(input.title, " ").trim() || "对话";
  const sections = visibleMessages(input).map(
    (message) =>
      "## " +
      (message.role === "user" ? "用户" : "助手") +
      "\n\n" +
      message.content,
  );
  return "# " + title + "\n\n" + sections.join("\n\n---\n\n") + "\n";
}

export function conversationMarkdownFilename(title: string): string {
  let stem = replaceControls(title, "_")
    .normalize("NFC")
    .trim()
    .replace(/\.md$/i, "")
    .replace(/[<>:"/\\|?*]/gu, "_")
    .replace(/[. ]+$/u, "");
  if (!stem || /^\.+$/u.test(stem)) stem = "对话";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem))
    stem = "对话-" + stem;
  return Array.from(stem).slice(0, 100).join("") + ".md";
}

export async function copyMessageText(
  content: string,
  clipboard?: Pick<Clipboard, "writeText">,
): Promise<{ ok: boolean; message: string }> {
  try {
    const target = clipboard ?? globalThis.navigator?.clipboard;
    if (!target) throw new Error("clipboard unavailable");
    await target.writeText(content);
    return { ok: true, message: "已复制消息" };
  } catch {
    return { ok: false, message: "复制失败，请手动选择文本复制。" };
  }
}

const browserDownloadEnvironment: ConversationDownloadEnvironment = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  clickDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
  },
  scheduleRelease: (callback) => {
    setTimeout(callback, 1000);
  },
};

/** User-initiated local export only; no conversation or internal objects are persisted. */
export function downloadConversationMarkdown(
  input: ConversationShareInput,
  environment: ConversationDownloadEnvironment = browserDownloadEnvironment,
): string {
  if (!visibleMessages(input).length)
    throw new Error("还没有可导出的对话内容。");
  const filename = conversationMarkdownFilename(input.title);
  const url = environment.createObjectURL(
    new Blob([formatConversationMarkdown(input)], {
      type: "text/markdown;charset=utf-8",
    }),
  );
  try {
    environment.clickDownload(url, filename);
  } finally {
    environment.scheduleRelease(() => environment.revokeObjectURL(url));
  }
  return filename;
}
