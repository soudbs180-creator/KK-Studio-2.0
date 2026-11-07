import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import UiIcon, { type UiIconName } from "../UiIcon";

export type ButtonHeightTier = "44px" | "40px" | "32px" | "24px" | "16px";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  heightTier?: ButtonHeightTier;
  variant?: ButtonVariant;
  isLoading?: boolean;
  isPill?: boolean;
  prefixIcon?: UiIconName | ReactNode;
  suffixIcon?: UiIconName | ReactNode;
  decoupleTouchHit?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      heightTier = "32px",
      variant = "secondary",
      isLoading = false,
      isPill = false,
      prefixIcon,
      suffixIcon,
      decoupleTouchHit = true,
      disabled = false,
      className = "",
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isCompactTier = heightTier !== "44px";
    const shouldDecouple = decoupleTouchHit && isCompactTier;

    const tierClassMap: Record<ButtonHeightTier, string> = {
      "44px": "kk-button--44",
      "40px": "kk-button--40",
      "32px": "kk-button--32",
      "24px": "kk-button--24",
      "16px": "kk-button--16",
    };

    const isIconOnly = children === undefined || children === null;
    const iconSizeMap: Record<ButtonHeightTier, number> = isIconOnly
      ? {
          "44px": 28,
          "40px": 24,
          "32px": 16,
          "24px": 16,
          "16px": 12,
        }
      : {
          "44px": 20,
          "40px": 16,
          "32px": 16,
          "24px": 16,
          "16px": 12,
        };

    const iconSize = iconSizeMap[heightTier];

    const classNames = [
      "kk-button",
      tierClassMap[heightTier],
      isIconOnly ? "kk-button--icon" : "",
      `kk-button--${variant}`,
      isPill ? "kk-button--pill" : "",
      shouldDecouple ? "kk-button--decoupled-hit" : "",
      isLoading ? "is-loading" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const renderIcon = (icon: UiIconName | ReactNode) => {
      if (!icon) return null;
      if (typeof icon === "string") {
        return <UiIcon name={icon as UiIconName} size={iconSize} />;
      }
      return icon;
    };

    return (
      <button
        ref={ref}
        type={type}
        className={classNames}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        data-height-tier={heightTier}
        {...rest}
      >
        {isLoading ? (
          <span className="kk-button__spinner" aria-hidden="true">
            <UiIcon name="loading" size={iconSize} />
          </span>
        ) : (
          renderIcon(prefixIcon)
        )}
        {children !== undefined && children !== null && (
          <span className="kk-button__label">{children}</span>
        )}
        {!isLoading && renderIcon(suffixIcon)}
      </button>
    );
  },
);

export default Button;
