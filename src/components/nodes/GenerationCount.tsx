import { useEffect, useRef } from "react";
import "../../styles/generation-count.css";

const COUNTS = ["1", "2", "4", "6", "8"];

interface GenerationCountProps {
  value: string;
  open: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}

export default function GenerationCount({
  value,
  open,
  onToggle,
  onChange,
}: GenerationCountProps) {
  const slider = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) slider.current?.focus({ preventScroll: true });
  }, [open]);
  return (
    <div className="control-anchor count-anchor" data-control="count">
      <button
        className="count-trigger"
        aria-label="生成数量"
        aria-expanded={open}
        onClick={onToggle}
      >
        <img src="/design/figma/count-x.svg" alt="" />
        <span>{value}</span>
      </button>
      {open && (
        <div
          className="generation-count-panel"
          role="group"
          aria-label="生成数量选项"
        >
          <span className="count-heading">生成数量</span>
          <span className="count-current" aria-hidden="true">
            ×{value}
          </span>
          <input
            ref={slider}
            type="range"
            min={0}
            max={4}
            step={1}
            value={COUNTS.indexOf(value)}
            aria-label="生成数量"
            aria-valuetext={value}
            onChange={(event) => onChange(COUNTS[Number(event.target.value)])}
          />
          <div className="count-stops">
            {COUNTS.map((count) => (
              <button
                key={count}
                aria-label={`生成 ${count} 个`}
                aria-pressed={value === count}
                onClick={() => onChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
