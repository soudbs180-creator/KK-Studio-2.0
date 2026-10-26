import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/tokens.css";
import "../../src/styles/global.css";
import "../../src/styles/ui-tokens.css";
import "../../src/styles/ui-governance.css";
import "../../src/components/settings/settings.css";
import { SettingsToggle } from "../../src/components/settings/SettingsControls";
import UiIcon from "../../src/components/UiIcon";
import designSource from "../../DESIGN.md?raw";
import { DocumentSource } from "./documentSource";
import "./preview.css";

const accents = [
  ["default", "默认绿色"],
  ["blue", "蓝色"],
  ["green", "绿色"],
  ["yellow", "黄色"],
  ["pink", "粉色"],
  ["orange", "橙色"],
  ["purple", "紫色"],
  ["white", "白色"],
] as const;
const colors = [
  ["surface", "表面", "--kk-bg-surface"],
  ["app", "应用背景", "--kk-bg-app"],
  ["accent", "强调色", "--kk-accent"],
  ["primary", "主动作", "--kk-button-primary-bg"],
  ["text", "正文", "--kk-text-primary"],
  ["danger", "危险", "--kk-text-danger"],
] as const;
const typography = ["caption", "body", "subtitle", "title", "display"] as const;
const spacing = [1, 2, 3, 4, 5, 6] as const;
const radii = ["control", "menu", "panel", "full"] as const;
const tokenNames = [
  ...colors.map(([, , token]) => token),
  ...typography.flatMap((name) => [`--kk-font-${name}`, `--kk-line-${name}`]),
  ...spacing.map((name) => `--kk-space-${name}`),
  ...radii.map((name) => `--kk-radius-${name}`),
  "--kk-card-pad",
];

function Preview() {
  const [theme, setTheme] = useState("dark");
  const [accent, setAccent] = useState("default");
  const [density, setDensity] = useState("comfortable");
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState(false);
  const [feedback, setFeedback] =
    useState("示例仅改变当前预览，不执行业务操作。");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.accent = accent;
    root.dataset.density = density;
    const resolve = () => {
      const style = getComputedStyle(root);
      setTokens(
        Object.fromEntries(
          tokenNames.map((name) => [name, style.getPropertyValue(name).trim()]),
        ),
      );
    };
    resolve();
    import.meta.hot?.on("vite:afterUpdate", resolve);
    return () => import.meta.hot?.off("vite:afterUpdate", resolve);
  }, [theme, accent, density]);

  return (
    <main
      className="design-preview"
      data-runtime-mode={
        import.meta.env.DEV ? "development" : "production-preview"
      }
    >
      <header>
        <p className="preview-kicker">KK Studio · 开发工具</p>
        <h1 className="kk-text-display">设计规范预览</h1>
        <p className="preview-muted">
          实际加载 tokens.css 与共享控件；所有切换仅在本页内存中生效。
        </p>
        <div className="preview-controls">
          <label>
            主题
            <select
              className="ui-input"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </label>
          <label>
            强调色
            <select
              className="ui-input"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
            >
              {accents.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            密度
            <select
              className="ui-input"
              value={density}
              onChange={(event) => setDensity(event.target.value)}
            >
              <option value="comfortable">舒适</option>
              <option value="compact">紧凑</option>
            </select>
          </label>
        </div>
      </header>

      <section aria-labelledby="color-heading">
        <h2 id="color-heading" className="kk-text-title">
          颜色
        </h2>
        <div className="preview-colors">
          {colors.map(([id, label, token]) => (
            <article className="preview-token" key={id}>
              <div
                className="preview-swatch"
                data-testid={`color-${id}`}
                style={{ background: `var(${token})` }}
              />
              <h3 className="kk-text-body-strong">{label}</h3>
              <code>{token}</code>
              <output data-testid={`color-${id}-value`}>{tokens[token]}</output>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="control-heading">
        <h2 id="control-heading" className="kk-text-title">
          共享控件与状态
        </h2>
        <div className="preview-samples">
          <button
            type="button"
            className="kk-button kk-button--primary"
            onClick={() => setFeedback("主动作示例已触发；未创建任务。")}
          >
            主动作示例
          </button>
          <button
            type="button"
            className="kk-button kk-button--secondary"
            onClick={() => setFeedback("次动作示例已触发。")}
          >
            次动作示例
          </button>
          <button
            type="button"
            className="ui-button"
            disabled
            title="未连接服务"
          >
            兼容禁用动作示例
          </button>
          <button
            type="button"
            className="kk-button"
            aria-pressed={selected}
            onClick={() => setSelected(!selected)}
          >
            选择状态示例
          </button>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="图标动作示例"
            onClick={() => setFeedback("图标动作示例已触发。 ")}
          >
            <UiIcon name="add" size={20} />
          </button>
          <button
            type="button"
            className="kk-button"
            disabled
            title="禁用态仅供检查"
          >
            禁用动作示例
          </button>
        </div>
        <div className="preview-fields">
          <label>
            输入框示例
            <input
              className="ui-input"
              placeholder="输入文字以检查输入与焦点"
            />
          </label>
          <label>
            禁用输入示例
            <input className="ui-input" value="只读状态示例" disabled />
          </label>
        </div>
        <div className="preview-samples">
          <div>
            <span id="preview-toggle-label">共享开关示例</span>
            <p id="preview-toggle-description" className="preview-muted">
              当前{checked ? "开启" : "关闭"}，点击或按空格切换。
            </p>
          </div>
          <SettingsToggle
            id="preview-toggle"
            checked={checked}
            onChange={setChecked}
          />
          <span id="preview-disabled-toggle-label">禁用开关示例</span>
          <span id="preview-disabled-toggle-description">当前服务不可用。</span>
          <SettingsToggle
            id="preview-disabled-toggle"
            checked={false}
            disabledReason="未连接服务，仅展示共享禁用态。"
          />
        </div>
        <p className="preview-feedback" role="status" aria-label="操作反馈">
          {feedback}
        </p>
        <p className="preview-muted">
          用 Tab 检查焦点；悬停、按下与禁用状态直接使用共享样式。
        </p>
      </section>

      <section aria-labelledby="type-heading">
        <h2 id="type-heading" className="kk-text-title">
          字体与行高
        </h2>
        <div className="preview-stack">
          {typography.map((name) => (
            <div key={name}>
              <p className={`kk-text-${name}`} data-testid={`type-${name}`}>
                创作清晰可读 · {name}
              </p>
              <code>
                {tokens[`--kk-font-${name}`]} / {tokens[`--kk-line-${name}`]}
              </code>
            </div>
          ))}
        </div>
      </section>

      <div className="preview-grid">
        <section aria-labelledby="spacing-heading">
          <h2 id="spacing-heading" className="kk-text-title">
            间距
          </h2>
          <div className="preview-stack">
            {spacing.map((name) => (
              <div className="preview-spacing-row" key={name}>
                <span
                  className="preview-spacing"
                  data-testid={`spacing-${name}`}
                  style={{ width: `var(--kk-space-${name})` }}
                />
                <code>
                  --kk-space-{name}: {tokens[`--kk-space-${name}`]}
                </code>
              </div>
            ))}
          </div>
        </section>
        <section aria-labelledby="radius-heading">
          <h2 id="radius-heading" className="kk-text-title">
            圆角与密度
          </h2>
          <div className="preview-samples">
            {radii.map((name) => (
              <div
                className="preview-radius"
                data-testid={`radius-${name}`}
                key={name}
                style={{ borderRadius: `var(--kk-radius-${name})` }}
              >
                <code>
                  {name}
                  <br />
                  {tokens[`--kk-radius-${name}`]}
                </code>
              </div>
            ))}
          </div>
          <div className="preview-density" data-testid="density-sample">
            卡片内边距：<output>{tokens["--kk-card-pad"]}</output>
          </div>
        </section>
      </div>

      <section aria-labelledby="source-heading">
        <h2 id="source-heading" className="kk-text-title">
          DESIGN.md 原文
        </h2>
        <p>
          在 IDE 或 Codex 编辑器中修改
          DESIGN.md；开发预览会自动刷新。构建预览需重新构建。
        </p>
        <p className="preview-muted">
          原文按纯文本展示，包含的 HTML 不执行。修改后运行 design:sync 与
          design:check，再查看差异。
        </p>
        <DocumentSource source={designSource} />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);
