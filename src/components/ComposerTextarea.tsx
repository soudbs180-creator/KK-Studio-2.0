import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** A shared visual input; drafts, IME and submission remain with each composer. */
export default function ComposerTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function fit() {
    const input = ref.current;
    if (!input || !input.getClientRects().length) return;
    const style = getComputedStyle(input);
    input.style.height = "0px";
    input.style.height = `${Math.max(parseFloat(style.minHeight), Math.min(input.scrollHeight, parseFloat(style.maxHeight)))}px`;
  }
  useLayoutEffect(fit, [props.value]);
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input) return;
    let width = -1;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== width) {
        width = entry.contentRect.width;
        fit();
      }
    });
    observer.observe(input);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <textarea {...props} className="composer-textarea" ref={ref} rows={3} />
  );
}
