import UiIcon from "../UiIcon";

export interface InlineSelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Closed control hugs the selected label and draws the shared 12px chevron.
 * The native select stays on top so keyboard, form value and tests keep working.
 * Figma 655:142612 / 47:184.
 */
export function InlineSelect<T extends string = string>({
  id,
  value,
  options,
  onChange,
  disabled = false,
  title,
  labelledBy,
  label,
  className = "",
}: {
  id?: string;
  value: T;
  options: ReadonlyArray<InlineSelectOption<T>>;
  onChange?: (value: T) => void;
  disabled?: boolean;
  title?: string;
  labelledBy?: string;
  label?: string;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value);
  return (
    <span className={`kk-inline-select ${className}`.trim()}>
      <span className="kk-inline-select__label" aria-hidden="true">
        {selected?.label ?? ""}
      </span>
      <UiIcon name="chevronDown" size={12} />
      <select
        id={id}
        className="kk-inline-select__control"
        value={value}
        disabled={disabled}
        title={title}
        aria-label={label}
        aria-labelledby={labelledBy}
        onChange={(event) => onChange?.(event.target.value as T)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

export default InlineSelect;
