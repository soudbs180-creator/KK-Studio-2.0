import type { CSSProperties, ReactNode } from "react";
import Dialog from "../../shared/ui/Dialog";
import UiIcon from "../UiIcon";

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
  style?: CSSProperties;
  /** Existing page panels own their header and scroll regions. */
  chrome?: boolean;
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
  style,
  chrome = true,
}: ModalProps) {
  if (!isOpen) return null;
  return (
    <Dialog
      title={title}
      onClose={onClose}
      closeOnBackdropClick={closeOnBackdropClick}
      style={style}
      className={
        chrome ? `kk-modal-dialog kk-modal--${size} ${className}` : className
      }
    >
      {chrome ? (
        <div className="kk-modal-shell">
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
      ) : (
        children
      )}
    </Dialog>
  );
}

export const Modal = ModalDialog;
export default ModalDialog;
