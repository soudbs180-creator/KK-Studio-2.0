import {
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
} from "react";
import type { CanvasParameters } from "../../domain/canvasItems.ts";
import {
  formatOpticsBadge,
  type CameraOptics,
} from "../../domain/cameraOptics.ts";
import { bindDirectorBridge } from "../../features/canvas/index.ts";
import { Button } from "../ui/Button.tsx";
import CameraOpticsControl from "./CameraOpticsControl.tsx";

function base(value?: CameraOptics): CameraOptics {
  return { lensMm: 50, aperture: "2.8", cameraAngle: "eye-level", ...value };
}

function angleFor(elevation: number): CameraOptics["cameraAngle"] {
  if (elevation >= 55) return "bird-eye";
  if (elevation >= 18) return "high-angle";
  if (elevation <= -18) return "low-angle";
  return "eye-level";
}

export function useNodeDirectorBridge(
  nodeId: string | undefined,
  activeParams: CanvasParameters,
  setLocalParameters: Dispatch<SetStateAction<CanvasParameters>>,
  onParametersChange?: (parameters: CanvasParameters) => void,
) {
  const director = useRef({
    parameters: activeParams,
    change: onParametersChange,
  });
  director.current = { parameters: activeParams, change: onParametersChange };
  useEffect(
    () =>
      nodeId
        ? bindDirectorBridge({
            nodeId,
            read: () => director.current.parameters.optics,
            apply: (optics) => {
              const next = { ...director.current.parameters, optics };
              setLocalParameters(next);
              director.current.change?.(next);
            },
          })
        : undefined,
    [nodeId, setLocalParameters],
  );
}

export function DirectorControlAnchor({
  busy,
  open,
  value,
  onToggle,
  onChange,
}: {
  busy: boolean;
  open: boolean;
  value?: CameraOptics;
  onToggle: () => void;
  onChange: (optics?: CameraOptics) => void;
}) {
  return (
    <div className="control-anchor" data-control="director">
      <Button
        isPill
        className="director-capsule"
        disabled={busy}
        aria-expanded={open}
        aria-label="镜头与导演台"
        onClick={onToggle}
      >
        {formatOpticsBadge(value)}
      </Button>
      {open && !busy && <DirectorConsole value={value} onChange={onChange} />}
    </div>
  );
}

export default function DirectorConsole({
  value,
  onChange,
  onCapture,
}: {
  value?: CameraOptics;
  onChange: (value?: CameraOptics) => void;
  onCapture?: (value: CameraOptics) => void;
}) {
  const optics = base(value);
  const board = useRef<SVGSVGElement>(null);
  function place(event: PointerEvent<SVGSVGElement>) {
    const rect = board.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const azimuth = Math.round((Math.atan2(x, -y) * 180) / Math.PI);
    const elevation = Math.round(Math.max(-90, Math.min(90, -y * 180)));
    onChange({
      ...optics,
      azimuthDeg: azimuth,
      elevationDeg: elevation,
      cameraAngle: angleFor(elevation),
    });
  }
  const markX = 80 + ((optics.azimuthDeg ?? 0) / 180) * 56;
  const markY = 80 - ((optics.elevationDeg ?? 0) / 90) * 56;
  const spread = Math.max(8, Math.min(56, 1400 / optics.lensMm));
  return (
    <div
      className="director-console"
      role="dialog"
      aria-label="镜头与导演控制台"
    >
      <p className="director-title">导演机位与光学</p>
      <p className="director-caption">水平环绕 -180°…180° · 俯仰 -90°…90°</p>
      <p className="director-caption">
        请求等待可取消；离线/失败保留已有数据；成功后状态反馈
      </p>
      <p className="director-console-summary">{formatOpticsBadge(value)}</p>
      <svg
        ref={board}
        className="director-viewport"
        viewBox="0 0 160 160"
        role="img"
        aria-label="机位环绕视口"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          place(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            place(event);
        }}
      >
        <path d="M8 96 H152" />
        <path d="M80 148 L16 96" />
        <path d="M80 148 L48 96" />
        <path d="M80 148 L112 96" />
        <path d="M80 148 L144 96" />
        <path d="M16 112 H144 M24 128 H136" />
        <path
          className="director-fov"
          d={`M80 148 L${80 - spread} 96 L${80 + spread} 96 Z`}
        />
        <path
          className="director-figure"
          d="M80 78 a6 6 0 1 0 0.1 0 M74 86 h12 l4 16 h-20 z"
        />
        <circle className="director-mark" cx={markX} cy={markY} r="6" />
      </svg>
      {onCapture && (
        <Button isPill onClick={() => onCapture(optics)}>
          一键抓拍参考图
        </Button>
      )}
      <CameraOpticsControl value={value} onChange={onChange} />
    </div>
  );
}
