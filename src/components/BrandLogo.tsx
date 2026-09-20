const LOGOS = {
  app: { file: "logo", size: 26 },
  hero: { file: "logo-hero", size: 63.141 },
  account: { file: "logo-account", size: 30 },
  model: { file: "logo-model", size: 20 },
  credit: { file: "logo-credit", size: 11 },
  message: { file: "logo-message", size: 12 },
} as const;

// Each asset is the complete Figma frame, including its clipping mask.
// Do not use the taller inner Group or recreate its crop in page CSS.
export default function BrandLogo({
  variant = "app",
  className,
}: {
  variant?: keyof typeof LOGOS;
  className?: string;
}) {
  const logo = LOGOS[variant];
  return (
    <img
      className={className}
      src={`/design/figma/${logo.file}.svg`}
      width={logo.size}
      height={logo.size}
      alt=""
      draggable={false}
      data-brand-logo={variant}
    />
  );
}
