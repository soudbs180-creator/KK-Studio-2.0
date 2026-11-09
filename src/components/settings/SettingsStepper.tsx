import UiIcon from "../UiIcon";

/** Figma 655:142641: 134×32 track, 16/24 Medium value, 16px glyphs. */
export default function SettingsStepper({
  id,
  value,
  min,
  max,
  step,
  onChange,
  labelledBy,
  describedBy,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  labelledBy: string;
  describedBy: string;
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  return (
    <div className="settings-stepper-wrap">
      <button
        type="button"
        className="settings-stepper-btn"
        aria-label="减少步数"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <UiIcon name="minus" size={16} />
      </button>
      <input
        type="number"
        id={id}
        className="settings-stepper-input"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(next)) onChange(clamp(next));
        }}
      />
      <button
        type="button"
        className="settings-stepper-btn"
        aria-label="增加步数"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <UiIcon name="plus" size={16} />
      </button>
    </div>
  );
}
