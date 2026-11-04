import React, { useEffect, useRef, type ReactNode } from "react";
import UiIcon from "../UiIcon";
import { focusDialogControl } from "../../shared/ui/focusDialogControl";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export function ModalDialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnBackdropClick = true,
  className = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPressRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      focusDialogControl(dialog);
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (!closeOnBackdropClick) return;
    const box = e.currentTarget.getBoundingClientRect();
    backdropPressRef.current =
      e.button === 0 &&
      e.target === e.currentTarget &&
      (e.clientX < box.left ||
        e.clientX > box.right ||
        e.clientY < box.top ||
        e.clientY > box.bottom);
  };

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const wasBackdrop = backdropPressRef.current;
    backdropPressRef.current = false;
    if (wasBackdrop && e.target === e.currentTarget && closeOnBackdropClick) {
      const box = e.currentTarget.getBoundingClientRect();
      if (
        e.clientX < box.left ||
        e.clientX > box.right ||
        e.clientY < box.top ||
        e.clientY > box.bottom
      ) {
        onClose();
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`kk-modal-dialog kk-modal--${size} ${className}`}
      aria-label={title}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="kk-modal-shell" onClick={(e) => e.stopPropagation()}>
        <header className="kk-modal__header">
          <h2 className="kk-modal__title">{title}</h2>
          <button
            type="button"
            className="kk-modal__close-btn"
            aria-label="关闭对话框"
            onClick={onClose}
          >
            <UiIcon name="close" size={16} />
          </button>
        </header>
        <div className="kk-modal__body">{children}</div>
        {footer && <footer className="kk-modal__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}

export const Modal = ModalDialog;
export default ModalDialog;
