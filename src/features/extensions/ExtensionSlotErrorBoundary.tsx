import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  slotId: string;
  itemId?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ExtensionSlotErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ExtensionSlotErrorBoundary] Caught error in slot "${this.props.slotId}" (item: ${this.props.itemId ?? "unknown"}):`,
      error,
      errorInfo,
    );
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <span
          className="kk-badge kk-badge--16 kk-badge--danger kk-extension-slot-error"
          title={this.state.error?.message}
        >
          [Ext Error]
        </span>
      );
    }
    return this.props.children;
  }
}
