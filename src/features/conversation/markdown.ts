import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Definition, Nodes } from "mdast";

export type MessageMarkdownTag =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "blockquote"
  | "ul"
  | "ol"
  | "li"
  | "strong"
  | "em"
  | "del"
  | "a"
  | "br"
  | "hr"
  | "table"
  | "thead"
  | "tbody"
  | "tr"
  | "th"
  | "td";

/** Only this allowlisted model reaches React; HTML and arbitrary attributes do not. */
export interface MessageMarkdownNode {
  type: "element" | "text" | "code" | "image" | "checkbox";
  tag?: MessageMarkdownTag;
  value?: string;
  children?: MessageMarkdownNode[];
  url?: string;
  title?: string;
  alt?: string;
  language?: string;
  inline?: boolean;
  checked?: boolean;
  start?: number;
  align?: "left" | "right" | "center";
}

const parser = unified().use(remarkParse).use(remarkGfm);
const text = (value: string): MessageMarkdownNode => ({ type: "text", value });
const element = (
  tag: MessageMarkdownTag,
  children: MessageMarkdownNode[] = [],
): MessageMarkdownNode => ({ type: "element", tag, children });

/** Explicit schemes only: no local files, credentials, data, script or protocol-relative URLs. */
export function safeMarkdownUrl(
  value: string,
  image = false,
): string | undefined {
  const candidate = value.trim();
  if (
    !candidate ||
    Array.from(candidate).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127;
    })
  )
    return undefined;
  if (!image && candidate.startsWith("#")) return candidate;
  try {
    const url = new URL(candidate);
    if (url.username || url.password) return undefined;
    const allowed =
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      (!image && url.protocol === "mailto:" && Boolean(url.pathname));
    return allowed ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function parseMessageMarkdown(source: string): MessageMarkdownNode[] {
  if (!source) return [];
  try {
    const root = parser.parse(source);
    const definitions = new Map<string, Definition>();
    function collect(node: Nodes): void {
      if (node.type === "definition" && !definitions.has(node.identifier))
        definitions.set(node.identifier, node);
      if ("children" in node) node.children.forEach(collect);
    }
    collect(root);
    const children = (node: Nodes): MessageMarkdownNode[] =>
      "children" in node ? node.children.flatMap(convert) : [];
    function convert(node: Nodes): MessageMarkdownNode[] {
      switch (node.type) {
        case "root":
          return children(node);
        case "paragraph":
          return [element("p", children(node))];
        case "heading": {
          const headings: MessageMarkdownTag[] = [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
          ];
          return [element(headings[node.depth - 1], children(node))];
        }
        case "blockquote":
          return [element("blockquote", children(node))];
        case "strong":
          return [element("strong", children(node))];
        case "emphasis":
          return [element("em", children(node))];
        case "delete":
          return [element("del", children(node))];
        case "list":
          return [
            {
              ...element(node.ordered ? "ol" : "ul", children(node)),
              start: node.start ?? undefined,
            },
          ];
        case "listItem":
          return [
            element("li", [
              ...(typeof node.checked === "boolean"
                ? [{ type: "checkbox" as const, checked: node.checked }]
                : []),
              ...children(node),
            ]),
          ];
        case "table": {
          const rows = node.children.map((row, rowIndex) =>
            element(
              "tr",
              row.children.map((cell, cellIndex) => ({
                ...element(rowIndex === 0 ? "th" : "td", children(cell)),
                align: node.align?.[cellIndex] ?? undefined,
              })),
            ),
          );
          return [
            element("table", [
              element("thead", rows.slice(0, 1)),
              element("tbody", rows.slice(1)),
            ]),
          ];
        }
        case "footnoteDefinition":
          return [
            element("blockquote", [
              element("p", [text("[^" + node.identifier + "]:")]),
              ...children(node),
            ]),
          ];
        default:
          return convertContent(node);
      }
    }
    function convertContent(node: Nodes): MessageMarkdownNode[] {
      switch (node.type) {
        case "text":
        case "html":
          return [text(node.value)];
        case "break":
          return [element("br")];
        case "thematicBreak":
          return [element("hr")];
        case "code":
        case "inlineCode":
          return [
            {
              type: "code",
              value: node.value,
              inline: node.type === "inlineCode",
              ...(node.type === "code" && node.lang
                ? {
                    language: node.lang
                      .replace(/[^a-z0-9_-]/gi, "")
                      .slice(0, 40),
                  }
                : {}),
            },
          ];
        case "definition":
          return [];
        case "footnoteReference":
          return [text("[^" + node.identifier + "]")];
        default:
          return convertReference(node);
      }
    }
    function convertReference(node: Nodes): MessageMarkdownNode[] {
      switch (node.type) {
        case "link":
        case "linkReference": {
          const target =
            node.type === "link" ? node : definitions.get(node.identifier);
          const url = target && safeMarkdownUrl(target.url);
          return url
            ? [
                {
                  ...element("a", children(node)),
                  url,
                  title: target?.title ?? undefined,
                },
              ]
            : children(node);
        }
        case "image":
        case "imageReference": {
          const target =
            node.type === "image" ? node : definitions.get(node.identifier);
          const url = target && safeMarkdownUrl(target.url, true);
          return url
            ? [
                {
                  type: "image",
                  url,
                  alt: node.alt ?? "",
                  title: target?.title ?? undefined,
                },
              ]
            : [text(node.alt ?? "")];
        }
        default:
          return children(node);
      }
    }
    return convert(root);
  } catch {
    // Incomplete streamed input must remain readable even if a parser fails.
    return [text(source)];
  }
}
