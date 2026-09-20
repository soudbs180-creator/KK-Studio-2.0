import { useEffect, useRef, type ReactNode } from "react";

export default function Modal({
  children,
  title,
  onClose,
  className = "",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const initialFocus = dialog.querySelector<HTMLElement>(
      "[data-initial-focus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    );
    (initialFocus ?? dialog).focus({ preventScroll: true });
    return () => {
      // A nested dialog can be opened as the parent unmounts. Closing the
      // parent must not steal focus from the still-open child dialog.
      const activeDialog =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest("dialog[open]")
          : null;
      const focusBelongsToThisDialog = !activeDialog || activeDialog === dialog;
      if (dialog.open) dialog.close();
      if (
        focusBelongsToThisDialog &&
        previous?.isConnected &&
        (document.activeElement === document.body ||
          document.activeElement === dialog ||
          dialog.contains(document.activeElement))
      ) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}
