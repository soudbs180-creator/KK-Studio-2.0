import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_ASSET_TAGS,
  normalizeTags,
  validateTagName,
} from "../domain/assets";
import UiIcon from "./UiIcon";
import "../styles/tag-editor.css";

export default function TagEditor({
  tags = [],
  customTags = [],
  onChange,
  onCreateTag,
  label = "编辑标签",
  compact = false,
  floating = false,
}: {
  tags?: string[];
  customTags?: string[];
  onChange: (tags: string[]) => void | string;
  onCreateTag?: (name: string) => void;
  label?: string;
  compact?: boolean;
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties>();
  const options = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_ASSET_TAGS,
          "收藏",
          ...normalizeTags(customTags),
          ...tags,
        ]),
      ),
    [customTags, tags],
  );
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target) &&
        !popover.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open]);
  useLayoutEffect(() => {
    if (open)
      popover.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true });
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !floating) return;
    const update = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;
      const height = popover.current?.offsetHeight ?? 210;
      const top =
        box.top - height - 8 >= 8 ? box.top - height - 8 : box.bottom + 8;
      const width = popover.current?.offsetWidth ?? 264;
      const left = Math.max(
        8,
        Math.min(box.right - width, window.innerWidth - width - 8),
      );
      setFloatingStyle({
        top: Math.max(8, Math.min(top, window.innerHeight - height - 8)),
        left,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, floating, options.length, status]);
  function toggle(tag: string): void {
    setStatus("");
    if (
      !tags.includes(tag) &&
      tag !== "收藏" &&
      tags.filter((value) => value !== "收藏").length >= 32
    ) {
      setStatus("每张卡片最多32个分类标签，请先移除一个。");
      return;
    }
    const message = onChange(
      tags.includes(tag)
        ? tags.filter((value) => value !== tag)
        : [...tags, tag],
    );
    if (message) setStatus(message);
  }
  function addCustom(): void {
    const value = draft.trim();
    const validation = validateTagName(value, options);
    if (validation.error) {
      setStatus(validation.error);
      return;
    }
    if (!validation.name) return;
    if (
      tags.filter((tag) => tag !== "收藏").length >= 32 ||
      customTags.length >= 32
    ) {
      setStatus("已达到32个标签的上限，请先移除一个。");
      return;
    }
    onCreateTag?.(validation.name);
    const message = onChange([...tags, validation.name]);
    if (message) {
      setStatus(message);
      return;
    }
    setDraft("");
    setStatus("");
  }
  function close(): void {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div ref={root} className="tag-editor">
      <button
        ref={trigger}
        type="button"
        className={`tag-editor-trigger ${compact ? "is-compact" : ""}`}
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => {
          setStatus("");
          setOpen((value) => !value);
        }}
      >
        <UiIcon name="tag" size={16} />
        {!compact && <span>标签</span>}
      </button>
      {open &&
        (() => {
          const panel = (
            <div
              ref={popover}
              className={`tag-editor-popover ${floating ? "is-floating" : ""}`}
              style={floating ? floatingStyle : undefined}
              role="dialog"
              aria-label={label}
              onKeyDown={(event) => {
                if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                }
              }}
            >
              <header>
                <strong>标签</strong>
                <button type="button" aria-label="关闭标签编辑" onClick={close}>
                  <UiIcon name="close" size={16} />
                </button>
              </header>
              <div className="tag-editor-options">
                {options.map((tag) => {
                  const checked = tags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      className={checked ? "is-selected" : ""}
                      aria-pressed={checked}
                      onClick={() => toggle(tag)}
                    >
                      <span>{tag}</span>
                      {checked && <span aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
              <form
                className="tag-editor-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  addCustom();
                }}
              >
                <input
                  value={draft}
                  maxLength={40}
                  placeholder="添加自定义标签"
                  aria-label="添加自定义标签"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  type="submit"
                  aria-label="添加标签"
                  disabled={!draft.trim()}
                >
                  <UiIcon name="add" size={16} />
                </button>
              </form>
              {status && (
                <p className="tag-editor-status" role="status">
                  {status}
                </p>
              )}
            </div>
          );
          return floating ? createPortal(panel, document.body) : panel;
        })()}
    </div>
  );
}
