import { Component, Suspense, useEffect, useRef, type ReactNode } from "react";
import UiIcon from "./UiIcon";

function restoreDialogFocus(dialog: Element | null | undefined) {
  if (document.activeElement !== document.body) return;
  dialog
    ?.querySelector<HTMLElement>(
      "[data-initial-focus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    )
    ?.focus({ preventScroll: true });
}

function PanelLoadState({
  failed = false,
  onClose,
}: {
  failed?: boolean;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (failed) restoreDialogFocus(ref.current?.closest("dialog[open]"));
  }, [failed]);
  return (
    <section ref={ref} className="info-panel" aria-label="页面加载">
      <header>
        <h2>{failed ? "页面加载失败" : "正在加载…"}</h2>
        {onClose && (
          <button aria-label="关闭" onClick={onClose}>
            <UiIcon name="close" size={16} />
          </button>
        )}
      </header>
      <div className="help-copy" role={failed ? "alert" : "status"}>
        <p>
          {failed
            ? "页面加载失败，请检查网络后重新加载。"
            : "正在加载页面，可以继续等待或返回。"}
        </p>
        {failed && (
          <button className="btn secondary" onClick={() => location.reload()}>
            重新加载
          </button>
        )}
      </div>
    </section>
  );
}

function ReadyPanel({
  children,
  restoreFocus,
}: {
  children: ReactNode;
  restoreFocus: boolean;
}) {
  useEffect(() => {
    // A suspended panel removes its focused loading button when it resolves.
    // Restore the dialog's initial focus only when focus was left on the body.
    if (!restoreFocus) return;
    const dialog = Array.from(document.querySelectorAll("dialog[open]")).at(-1);
    restoreDialogFocus(dialog);
  }, [restoreFocus]);
  return children;
}

export default class DeferredPanelBoundary extends Component<
  { children: ReactNode; onClose?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { children, onClose } = this.props;
    if (this.state.failed) return <PanelLoadState failed onClose={onClose} />;
    return (
      <Suspense fallback={<PanelLoadState onClose={onClose} />}>
        <ReadyPanel restoreFocus={Boolean(onClose)}>{children}</ReadyPanel>
      </Suspense>
    );
  }
}
