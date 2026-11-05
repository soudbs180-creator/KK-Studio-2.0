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
  })
  .strict();
export type CameraOptics = z.infer<typeof CameraOpticsSchema>;

export function compileOpticsPrompt(input: CameraOptics): string {
  const optics = CameraOpticsSchema.parse(input);
  return [
    `${optics.lensMm}mm focal length lens`,
    `f/${optics.aperture.replace("f/", "")} aperture`,
    optics.focalDistance && `focal distance ${optics.focalDistance}`,
    optics.cameraBody && `shot on ${optics.cameraBody}`,
    optics.depthOfField && `${optics.depthOfField} depth of field`,
  ]
    .filter(Boolean)
    .join(", ");
}
