import CameraAngleInput from "./CameraAngleInput.tsx";
import {
  CAMERA_OPTICS_PRESETS,
  type CameraOptics,
} from "../../domain/cameraOptics.ts";
import { Button } from "../ui/Button.tsx";
import { Input } from "../ui/Input.tsx";
import { Select } from "../ui/Select.tsx";

const scales = [
  { value: "ECU", label: "极特写" },
  { value: "CU", label: "特写" },
  { value: "MCU", label: "近景" },
  { value: "MS", label: "中景" },
  { value: "WS", label: "全景" },
  { value: "EWS", label: "远景" },
] as const;
const angles = [
  { value: "bird-eye", label: "鸟瞰" },
  { value: "high-angle", label: "俯拍" },
  { value: "eye-level", label: "平视" },
  { value: "low-angle", label: "仰拍" },
  { value: "dutch-angle", label: "荷兰斜角" },
] as const;
export default function CameraOpticsControl({
  value,
  onChange,
}: {
  value?: CameraOptics;
  onChange: (value?: CameraOptics) => void;
}) {
  const patch = (change: Partial<CameraOptics>) =>
    onChange({ lensMm: 50, aperture: "2.8", ...value, ...change });
  return (
    <fieldset className="camera-optics-control">
      <legend>物理摄影机</legend>
      <Button
        isPill
        aria-pressed={Boolean(value)}
        onClick={() =>
          onChange(
            value
              ? undefined
              : { lensMm: 50, aperture: "2.8", depthOfField: "natural" },
          )
        }
      >
        {value ? "停用光学参数" : "启用光学参数"}
      </Button>
      {value && (
        <>
          <div className="camera-optics-choices" aria-label="光学预设">
            {CAMERA_OPTICS_PRESETS.map((p) => (
              <Button
                key={p.name}
                isPill
                onClick={() => onChange({ ...value, ...p.optics })}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <div className="camera-optics-choices" aria-label="景别快选">
            {scales.map((s) => (
              <Button
                key={s.value}
                isPill
                aria-pressed={value.shotScale === s.value}
                onClick={() => patch({ shotScale: s.value })}
              >
                {s.value} {s.label}
              </Button>
            ))}
          </div>
          <div className="camera-optics-choices" aria-label="机位角度快选">
            {angles.map((a) => (
              <Button
                key={a.value}
                isPill
                aria-pressed={value.cameraAngle === a.value}
                onClick={() => patch({ cameraAngle: a.value })}
              >
                {a.label}
              </Button>
            ))}
          </div>
          <label>
            焦段
            <Select
              aria-label="焦段"
              value={value.lensMm}
              options={[
                ...new Set([14, 24, 35, 50, 85, 135, 200, value.lensMm]),
              ]
                .sort((a, b) => a - b)
                .map((n) => ({ value: n, label: `${n} mm` }))}
              onChange={(lensMm) => patch({ lensMm })}
            />
          </label>
          <label>
            光圈
            <Select
              aria-label="光圈"
              value={value.aperture.replace(/^f\//u, "")}
              options={[
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
              ].map((n) => ({ value: n, label: `f/${n}` }))}
              onChange={(aperture) => patch({ aperture })}
            />
          </label>
          <label>
            对焦距离
            <Input
              aria-label="对焦距离"
              maxLength={80}
              value={value.focalDistance ?? ""}
              placeholder="例如 3 m"
              onChange={(e) =>
                patch({ focalDistance: e.target.value || undefined })
              }
            />
          </label>
          <label>
            机身
            <Input
              aria-label="摄影机机身"
              maxLength={120}
              value={value.cameraBody ?? ""}
              onChange={(e) =>
                patch({ cameraBody: e.target.value || undefined })
              }
            />
          </label>
          <label>
            景深
            <Select
              aria-label="景深"
              value={value.depthOfField ?? "natural"}
              options={[
                { value: "natural", label: "自然景深" },
                { value: "shallow", label: "浅景深" },
                { value: "deep", label: "深景深" },
              ]}
              onChange={(depthOfField) => patch({ depthOfField })}
            />
          </label>
          <CameraAngleInput
            label="水平环绕角"
            value={value.azimuthDeg ?? 0}
            limit={180}
            onChange={(azimuthDeg) => patch({ azimuthDeg })}
          />
          <CameraAngleInput
            label="俯仰角"
            value={value.elevationDeg ?? 0}
            limit={90}
            onChange={(elevationDeg) => patch({ elevationDeg })}
          />
          <small>参数将写入生成提示词；效果取决于所选模型。</small>
        </>
      )}
    </fieldset>
  );
}
