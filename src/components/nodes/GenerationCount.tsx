import { useEffect, useRef } from "react";
import "../../styles/generation-count.css";

const COUNTS = ["1", "2", "4", "6", "8"];

interface GenerationCountProps {
  maxCount?: number;
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
  maxCount = 8,
}: GenerationCountProps) {
  const slider = useRef<HTMLInputElement>(null);
  const counts = COUNTS.filter((count) => Number(count) <= maxCount);
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
            max={counts.length - 1}
            step={1}
            value={Math.max(0, counts.indexOf(value))}
            aria-label="生成数量"
            aria-valuetext={value}
            onChange={(event) => onChange(counts[Number(event.target.value)])}
          />
          <div className="count-stops">
            {counts.map((count) => (
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
