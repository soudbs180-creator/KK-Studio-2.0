import { invoke } from "@tauri-apps/api/core";
import { usesNativeAssets } from "../../features/creation/nativeAssetAdapter";
const websites = [
  { name: "Claude", url: "https://claude.ai/" },
  { name: "Perplexity", url: "https://www.perplexity.ai/" },
  { name: "Poe", url: "https://poe.com/" },
] as const;
export default function AiWebsiteLinks({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  return (
    <section className="model-provider-settings" aria-label="AI 网站入口">
      <h3>AI 网站入口</h3>
      <p>
        在浏览器中使用网站账号。这里不会读取登录状态、同步订阅或自动发送任务；API
        连接请在上方单独配置。
      </p>
      <div className="settings-action-group">
        {websites.map((website) => (
          <a
            key={website.name}
            className="settings-action"
            href={website.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              if (!usesNativeAssets()) return;
              event.preventDefault();
              void invoke("plugin:shell|open", {
                path: website.url,
                with: null,
              })
                .then(() =>
                  onFeedback(`已请求系统浏览器打开 ${website.name}。`),
                )
                .catch(() =>
                  onFeedback("无法打开系统浏览器，请复制官网链接手动访问。"),
                );
            }}
          >
            打开 {website.name} 官网
          </a>
        ))}
      </div>
    </section>
  );
}
