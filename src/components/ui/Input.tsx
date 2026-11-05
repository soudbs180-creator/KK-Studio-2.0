import React, {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import UiIcon, { type UiIconName } from "../UiIcon";

export type InputHeight = "32px" | "40px";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "prefix"
> {
  inputHeight?: InputHeight;
  isError?: boolean;
  errorMessage?: string;
  prefixIcon?: UiIconName | ReactNode;
  suffixIcon?: UiIconName | ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputHeight = "32px",
    isError = false,
    errorMessage,
    prefixIcon,
    suffixIcon,
    clearable = false,
    onClear,
    disabled = false,
    className = "",
    value,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = rest.id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasValue = value !== undefined && value !== null && value !== "";
  const iconSize = inputHeight === "40px" ? 18 : 16;

  const renderIcon = (icon: UiIconName | ReactNode) => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return <UiIcon name={icon as UiIconName} size={iconSize} />;
    }
    return icon;
  };

  return (
    <div className={`kk-input-wrapper ${className}`}>
      <div
        className={`kk-input-container kk-input--${
          inputHeight === "40px" ? "40" : "32"
        } ${isError ? "is-error" : ""} ${disabled ? "is-disabled" : ""}`}
      >
        {prefixIcon && (
          <span className="kk-input__prefix">{renderIcon(prefixIcon)}</span>
        )}
        <input
          {...rest}
          id={inputId}
          ref={ref}
          className="kk-input__field"
          disabled={disabled}
          value={value}
          aria-invalid={isError}
          aria-describedby={
            [rest["aria-describedby"], errorMessage ? errorId : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            className="kk-input__clear"
            aria-label="清空输入"
            onClick={onClear}
          >
            <UiIcon name="close" size={14} />
          </button>
        )}
        {suffixIcon && (
          <span className="kk-input__suffix">{renderIcon(suffixIcon)}</span>
        )}
      </div>
      {errorMessage && (
        <span id={errorId} className="kk-input__error-message" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
});

export default Input;
