import React, {
  useState,
  useRef,
  useEffect,
  useId,
  type ReactNode,
  type AriaAttributes,
} from "react";
import UiIcon from "../UiIcon";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps<
  T extends string | number = string,
> extends AriaAttributes {
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
  ...aria
}: SelectProps<T>) {
  const generatedId = useId();
  const menuId = `${id ?? generatedId}-options`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const typed = useRef({ text: "", at: 0 });
  const [internalValue, setInternalValue] = useState<T | undefined>(
    value ?? defaultValue,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const enabledIndexes = options.flatMap((option, index) =>
    option.disabled ? [] : [index],
  );
  function openMenu() {
    if (disabled) return;
    setIsOpen(true);
    const selected = options.findIndex(
      (option) => option.value === selectedValue && !option.disabled,
    );
    setActiveIndex(selected >= 0 ? selected : (enabledIndexes[0] ?? -1));
  }
  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);
  useEffect(() => {
    if (isOpen)
      containerRef.current
        ?.querySelector('[data-active="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

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
    if (option.disabled || disabled) return;
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
    setIsOpen(false);
  };

  function moveActive(key: string) {
    const index = enabledIndexes.indexOf(activeIndex);
    const next =
      key === "Home"
        ? 0
        : key === "End"
          ? enabledIndexes.length - 1
          : (index + (key === "ArrowDown" ? 1 : -1) + enabledIndexes.length) %
            enabledIndexes.length;
    setActiveIndex(enabledIndexes[next] ?? -1);
  }
  function typeahead(event: React.KeyboardEvent) {
    typed.current = {
      text:
        (Date.now() - typed.current.at > 700 ? "" : typed.current.text) +
        event.key.toLocaleLowerCase(),
      at: Date.now(),
    };
    const match = options.findIndex(
      (option) =>
        !option.disabled &&
        option.label.toLocaleLowerCase().startsWith(typed.current.text),
    );
    if (match >= 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(match);
    }
  }
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen && activeIndex >= 0) handleSelect(options[activeIndex]);
      else openMenu();
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        openMenu();
        if (event.key === "ArrowUp")
          setActiveIndex(enabledIndexes.at(-1) ?? -1);
        return;
      }
      if (!isOpen) openMenu();
      moveActive(event.key);
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      typeahead(event);
    }
  };

  return (
    <div
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setIsOpen(false);
      }}
      className={`kk-select-wrapper kk-select--${
        selectHeight === "40px" ? "40" : "32"
      } ${disabled ? "is-disabled" : ""} ${className}`}
    >
      <button
        {...aria}
        id={id}
        type="button"
        className={`kk-select__trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        role="combobox"
        aria-controls={menuId}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${menuId}-${activeIndex}` : undefined
        }
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
        <ul
          id={menuId}
          className="kk-select__menu"
          role="listbox"
          aria-label={aria["aria-label"]}
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            return (
              <li
                key={String(option.value)}
                id={`${menuId}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-active={activeIndex === index}
                className={`kk-select__option ${isSelected ? "is-selected" : ""} ${
                  option.disabled ? "is-disabled" : ""
                }`}
                onClick={() => handleSelect(option)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
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
