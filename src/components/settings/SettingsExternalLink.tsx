import { invoke, isTauri } from "@tauri-apps/api/core";
import { useState, type ReactNode } from "react";

export default function SettingsExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={async (event) => {
          if (!isTauri()) return;
          event.preventDefault();
          const path = event.currentTarget.href;
          setError("");
          try {
            await invoke("plugin:shell|open", { path });
          } catch {
            setError("浏览器未能打开，请复制来源链接后重试。");
          }
        }}
      >
        {children}
      </a>
      {error && (
        <span role="alert">
          {error} {href}
        </span>
      )}
    </>
  );
}
