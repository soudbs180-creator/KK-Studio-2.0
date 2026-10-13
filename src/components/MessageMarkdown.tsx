import { createElement, useMemo, type ReactNode } from "react";
import {
  parseMessageMarkdown,
  type MessageMarkdownNode,
} from "../features/conversation/markdown.ts";

function renderNode(node: MessageMarkdownNode, key: string): ReactNode {
  const children = node.children?.map((child, index) =>
    renderNode(child, key + "." + index),
  );
  switch (node.type) {
    case "text":
      return node.value;
    case "code": {
      const code = (
        <code
          className={node.language ? "language-" + node.language : undefined}
        >
          {node.value}
        </code>
      );
      return node.inline ? (
        <code key={key}>{node.value}</code>
      ) : (
        <pre key={key}>{code}</pre>
      );
    }
    case "image":
      return (
        <img
          key={key}
          src={node.url}
          alt={node.alt ?? ""}
          title={node.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      );
    case "checkbox":
      return (
        <input
          key={key}
          type="checkbox"
          checked={Boolean(node.checked)}
          readOnly
          disabled
          aria-label={node.checked ? "已完成" : "未完成"}
        />
      );
    case "element": {
      const tag = node.tag ?? "p";
      const props = {
        key,
        ...(tag === "a"
          ? {
              href: node.url,
              title: node.title,
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {}),
        ...(tag === "ol" && node.start !== undefined
          ? { start: node.start }
          : {}),
        ...(node.align ? { style: { textAlign: node.align } } : {}),
      };
      const rendered = createElement(tag, props, children);
      return tag === "table" ? (
        <div key={key} className="message-markdown-table">
          {rendered}
        </div>
      ) : (
        rendered
      );
    }
  }
}

/** Safe CommonMark/GFM display; the original message remains the copy/export source. */
export default function MessageMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const nodes = useMemo(() => parseMessageMarkdown(content), [content]);
  return (
    <div className={["message-markdown", className].filter(Boolean).join(" ")}>
      {nodes.map((node, index) => renderNode(node, String(index)))}
    </div>
  );
}
