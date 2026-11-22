import { focusDialogControl } from "./dialogFocus";
import {
  Component,
  Suspense,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import UiIcon from "./UiIcon";

function restoreDialogFocus(dialog: Element | null | undefined) {
  if (document.activeElement !== document.body) return;
  focusDialogControl(dialog);
}

function PanelLoadState({
  failed = false,
  onClose,
  focusScope,
}: {
  failed?: boolean;
  onClose?: () => void;
  focusScope?: RefObject<HTMLElement>;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (failed)
      restoreDialogFocus(
        focusScope?.current ?? ref.current?.closest("dialog[open]"),
      );
  }, [failed, focusScope]);
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
  focusScope,
}: {
  children: ReactNode;
  restoreFocus: boolean;
  focusScope?: RefObject<HTMLElement>;
}) {
  useEffect(() => {
    // A suspended panel removes its focused loading button when it resolves.
    // Restore the dialog's initial focus only when focus was left on the body.
    if (!restoreFocus) return;
    const dialog = Array.from(document.querySelectorAll("dialog[open]")).at(-1);
    restoreDialogFocus(focusScope?.current ?? dialog);
  }, [restoreFocus, focusScope]);
  return children;
}

export default class DeferredPanelBoundary extends Component<
  {
    children: ReactNode;
    onClose?: () => void;
    focusScope?: RefObject<HTMLElement>;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { children, onClose } = this.props;
    if (this.state.failed)
      return (
        <PanelLoadState
          failed
          onClose={onClose}
          focusScope={this.props.focusScope}
        />
      );
    return (
      <Suspense
        fallback={
          <PanelLoadState
            onClose={onClose}
            focusScope={this.props.focusScope}
          />
        }
      >
        <ReadyPanel
          restoreFocus={Boolean(onClose)}
          focusScope={this.props.focusScope}
        >
          {children}
        </ReadyPanel>
      </Suspense>
    );
  }
}
