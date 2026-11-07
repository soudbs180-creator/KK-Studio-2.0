import { useEffect, useState } from "react";
import { Input } from "../ui/Input.tsx";

const angleText = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/u;

export default function CameraAngleInput({
  label,
  value,
  limit,
  onChange,
}: {
  label: string;
  value: number;
  limit: number;
  onChange(value: number): void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(String(value));
    setError("");
  }, [value]);
  return (
    <label>
      {label}
      <Input
        aria-label={label}
        inputMode="decimal"
        value={draft}
        isError={Boolean(error)}
        errorMessage={error || undefined}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          if (!angleText.test(text)) return;
          const angle = Number(text);
          if (Math.abs(angle) <= limit) {
            setError("");
            onChange(angle);
          }
        }}
        onBlur={() => {
          const angle = Number(draft);
          if (
            !angleText.test(draft) ||
            !Number.isFinite(angle) ||
            Math.abs(angle) > limit
          ) {
            setError(`请输入 -${limit} 到 ${limit} 度`);
            setDraft(String(value));
          }
        }}
      />
    </label>
  );
}
