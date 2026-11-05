import type { CameraOptics } from "../../domain/cameraOptics.ts";

export default function CameraOpticsControl({
  value,
  onChange,
}: {
  value?: CameraOptics;
  onChange: (value?: CameraOptics) => void;
}) {
  return (
    <fieldset className="camera-optics-control">
      <legend>物理摄影机</legend>
      <label>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { lensMm: 50, aperture: "2.8", depthOfField: "natural" }
                : undefined,
            )
          }
        />
        启用光学参数
      </label>
      {value && (
        <>
          <label>
            焦段
            <select
              aria-label="焦段"
              value={value.lensMm}
              onChange={(e) =>
                onChange({ ...value, lensMm: Number(e.target.value) })
              }
            >
              {[...new Set([14, 24, 35, 50, 85, 135, 200, value.lensMm])]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {n} mm
                  </option>
                ))}
            </select>
          </label>
          <label>
            光圈
            <select
              aria-label="光圈"
              value={value.aperture.replace(/^f\//u, "")}
              onChange={(e) => onChange({ ...value, aperture: e.target.value })}
            >
              {[
                ...new Set([
                  "1.4",
                  "1.8",
                  "2.8",
                  "4",
                  "5.6",
                  "8",
                  "11",
                  "16",
                  "22",
                  value.aperture.replace(/^f\//u, ""),
                ]),
              ].map((n) => (
                <option key={n} value={n}>
                  f/{n}
                </option>
              ))}
            </select>
          </label>
          <label>
            对焦距离
            <input
              aria-label="对焦距离"
              maxLength={80}
              value={value.focalDistance ?? ""}
              placeholder="例如 3 m"
              onChange={(e) =>
                onChange({
                  ...value,
                  focalDistance: e.target.value || undefined,
                })
              }
            />
          </label>
          <label>
            机身
            <input
              aria-label="摄影机机身"
              maxLength={120}
              value={value.cameraBody ?? ""}
              onChange={(e) =>
                onChange({ ...value, cameraBody: e.target.value || undefined })
              }
            />
          </label>
          <label>
            景深
            <select
              aria-label="景深"
              value={value.depthOfField ?? "natural"}
              onChange={(e) =>
                onChange({
                  ...value,
                  depthOfField: e.target.value as CameraOptics["depthOfField"],
                })
              }
            >
              <option value="natural">自然景深</option>
              <option value="shallow">浅景深</option>
              <option value="deep">深景深</option>
            </select>
          </label>
          <small>参数将写入生成提示词；效果取决于所选模型。</small>
        </>
      )}
    </fieldset>
  );
}
