import { z } from "zod";

export const CameraOpticsSchema = z
  .object({
    lensMm: z.number().finite().min(4).max(2000),
    aperture: z
      .string()
      .regex(/^(?:f\/)?(?:\d+(?:\.\d+)?)$/)
      .refine((s) => {
        const n = Number(s.replace("f/", ""));
        return n >= 0.7 && n <= 64;
      }),
    focalDistance: z.string().trim().min(1).max(80).optional(),
    cameraBody: z.string().trim().min(1).max(120).optional(),
    depthOfField: z.enum(["shallow", "deep", "natural"]).optional(),
    shotScale: z.enum(["ECU", "CU", "MCU", "MS", "WS", "EWS"]).optional(),
    cameraAngle: z
      .enum(["bird-eye", "high-angle", "eye-level", "low-angle", "dutch-angle"])
      .optional(),
    azimuthDeg: z.number().finite().min(-180).max(180).optional(),
    elevationDeg: z.number().finite().min(-90).max(90).optional(),
  })
  .strict();
export type CameraOptics = z.infer<typeof CameraOpticsSchema>;

export const SHOT_SCALES = {
  ECU: "extreme close-up",
  CU: "close-up",
  MCU: "medium close-up",
  MS: "medium shot",
  WS: "wide shot",
  EWS: "extreme wide shot",
} as const;
export const CAMERA_ANGLES = {
  "bird-eye": "bird's-eye view",
  "high-angle": "high-angle shot",
  "eye-level": "eye-level shot",
  "low-angle": "low-angle shot",
  "dutch-angle": "Dutch angle",
} as const;
export const CAMERA_OPTICS_PRESETS: ReadonlyArray<{
  name: string;
  optics: CameraOptics;
}> = [
  {
    name: "肖像特写 85mm f/1.4",
    optics: {
      lensMm: 85,
      aperture: "1.4",
      depthOfField: "shallow",
      shotScale: "CU",
      cameraAngle: "eye-level",
    },
  },
  {
    name: "电影广角 24mm f/2.8",
    optics: {
      lensMm: 24,
      aperture: "2.8",
      depthOfField: "deep",
      shotScale: "WS",
      cameraAngle: "eye-level",
    },
  },
  {
    name: "希区柯克变焦 50mm",
    optics: {
      lensMm: 50,
      aperture: "2.8",
      shotScale: "MS",
      cameraAngle: "eye-level",
    },
  },
  {
    name: "微距细节 135mm",
    optics: {
      lensMm: 135,
      aperture: "4",
      depthOfField: "shallow",
      shotScale: "ECU",
      cameraAngle: "eye-level",
    },
  },
];

export const DirectorMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("storyai:director-apply"),
      nodeId: z.string().min(1).max(160),
      optics: CameraOpticsSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("storyai:director-sync"),
      nodeId: z.string().min(1).max(160),
    })
    .strict(),
]);

export function compileOpticsPrompt(input: CameraOptics): string {
  const optics = CameraOpticsSchema.parse(input);
  return [
    `${optics.lensMm}mm focal length lens`,
    `f/${optics.aperture.replace("f/", "")} aperture`,
    optics.focalDistance && `focal distance ${optics.focalDistance}`,
    optics.cameraBody && `shot on ${optics.cameraBody}`,
    optics.depthOfField && `${optics.depthOfField} depth of field`,
    optics.shotScale && SHOT_SCALES[optics.shotScale],
    optics.cameraAngle && CAMERA_ANGLES[optics.cameraAngle],
    optics.azimuthDeg !== undefined &&
      `camera azimuth ${optics.azimuthDeg} degrees`,
    optics.elevationDeg !== undefined &&
      `camera elevation ${optics.elevationDeg} degrees`,
  ]
    .filter(Boolean)
    .join(", ");
}

export const compileCameraOpticsPrompt = compileOpticsPrompt;

const ANGLE_LABEL = {
  "bird-eye": "鸟瞰",
  "high-angle": "俯拍",
  "eye-level": "平视",
  "low-angle": "仰拍",
  "dutch-angle": "荷兰斜角",
} as const;

/** Compact capsule copy, for example `50mm · f/2.8 · 平视`. */
export function formatOpticsBadge(optics?: CameraOptics): string {
  if (!optics) return "镜头";
  const aperture = optics.aperture.startsWith("f/")
    ? optics.aperture
    : `f/${optics.aperture}`;
  const angle = optics.cameraAngle ? ANGLE_LABEL[optics.cameraAngle] : "平视";
  return `${optics.lensMm}mm · ${aperture} · ${angle}`;
}
