import { readFile, writeFile } from "node:fs/promises";

// Phone colors follow their approved mobile reference independently of desktop.
const sourceUrl = new URL(
  "../src/ui/mobileColors.source.json",
  import.meta.url,
);
const outputUrl = new URL(
  "../src/ui/colorTokens.generated.json",
  import.meta.url,
);
const source = JSON.parse(await readFile(sourceUrl, "utf8"));
const keys = Object.keys(source.colors.light);
if (!source.reference?.sha || keys.length === 0)
  throw new Error("Mobile visual reference or colors are missing.");
for (const mode of ["light", "dark"]) {
  const colors = source.colors[mode];
  if (Object.keys(colors).sort().join() !== [...keys].sort().join())
    throw new Error(`Mobile ${mode} semantic roles differ from light.`);
  for (const [role, color] of Object.entries(colors))
    if (
      typeof color !== "string" ||
      !/^(#[a-f\d]{6}|rgba\([\d\s.,]+\))$/i.test(color)
    )
      throw new Error(`Invalid native mobile color: ${mode}.${role}`);
}
const output = `${JSON.stringify({ source: "mobile/src/ui/mobileColors.source.json", ...source }, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(outputUrl, "utf8");
  if (current.replaceAll("\r\n", "\n") !== output)
    throw new Error(
      "Mobile reference colors drifted. Run npm run colors:sync.",
    );
  process.stdout.write(
    "Mobile colors match the pinned mobile semantic source.\n",
  );
} else {
  await writeFile(outputUrl, output);
  process.stdout.write(
    "Compiled pinned mobile semantic colors for the native client.\n",
  );
}
