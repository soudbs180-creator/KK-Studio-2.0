import React, { useState, useRef, useEffect, type ReactNode } from "react";
import UiIcon from "../UiIcon";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps<T extends string | number = string> {
  options: SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  selectHeight?: "32px" | "40px";
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select<T extends string | number = string>({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "请选择...",
  selectHeight = "32px",
  disabled = false,
  className = "",
  id,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<T | undefined>(
    value ?? defaultValue,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === selectedValue);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`kk-select-wrapper kk-select--${
        selectHeight === "40px" ? "40" : "32"
      } ${disabled ? "is-disabled" : ""} ${className}`}
    >
      <button
        id={id}
        type="button"
        className={`kk-select__trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="kk-select__selected-text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className={`kk-select__arrow ${isOpen ? "is-rotated" : ""}`}
          aria-hidden="true"
        >
          <UiIcon name="chevronDown" size={14} />
        </span>
      </button>

      {isOpen && (
        <ul className="kk-select__menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === selectedValue;
            return (
              <li
                key={String(option.value)}
                role="option"
                aria-selected={isSelected}
                className={`kk-select__option ${isSelected ? "is-selected" : ""} ${
                  option.disabled ? "is-disabled" : ""
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.icon && (
                  <span className="kk-select__option-icon">{option.icon}</span>
                )}
                <span className="kk-select__option-label">{option.label}</span>
                {isSelected && (
                  <span className="kk-select__check">
                    <UiIcon name="check" size={14} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Select;
