import { PNG } from "playwright-core/lib/utilsBundle";

// Pixel comparison between a Figma reference image and a locally rendered
// screenshot.
//
// L4 pixel equality cannot be strict: the Figma renderer and the browser
// rasteriser differ in font hinting, antialiasing, shadow blurring and colour
// interpolation. This module therefore reports a difference ratio and lets the
// caller decide the tolerance, instead of claiming byte equality.
//
// No extra dependency is required: Playwright already bundles pngjs.

function decode(buffer) {
  return PNG.sync.read(buffer);
}

function dimensions(png) {
  return { width: png.width, height: png.height };
}

// Figma exports often carry a one-pixel frame border that the browser render
// does not. Cropping to the shared region lets the two be compared instead of
// failing on a trivial size difference.
function crop(png, width, height, offsetX = 0, offsetY = 0) {
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = ((y + offsetY) * png.width + (x + offsetX)) * 4;
      const to = (y * width + x) * 4;
      output.data[to] = png.data[from];
      output.data[to + 1] = png.data[from + 1];
      output.data[to + 2] = png.data[from + 2];
      output.data[to + 3] = png.data[from + 3];
    }
  }
  return output;
}

// Compares two PNG buffers and returns the share of differing pixels.
// A pixel counts as different when any channel diverges beyond `channelTolerance`.
export function comparePixels(referenceBuffer, actualBuffer, options = {}) {
  const channelTolerance = options.channelTolerance ?? 8;
  let reference = decode(referenceBuffer);
  let actual = decode(actualBuffer);
  let aligned = false;

  if (reference.width !== actual.width || reference.height !== actual.height) {
    if (!options.allowCrop) {
      return {
        comparable: false,
        reason: "dimensions differ",
        reference: dimensions(reference),
        actual: dimensions(actual),
        diffRatio: 1,
        diffPixels: reference.width * reference.height,
        totalPixels: reference.width * reference.height,
        diffImage: null,
      };
    }
    const width = Math.min(reference.width, actual.width);
    const height = Math.min(reference.height, actual.height);
    const referenceOffsetY = reference.height > height ? 1 : 0;
    const actualOffsetY = actual.height > height ? 1 : 0;
    reference = crop(reference, width, height, 0, referenceOffsetY);
    actual = crop(actual, width, height, 0, actualOffsetY);
    aligned = true;
  }

  const total = reference.width * reference.height;
  const output = new PNG({ width: reference.width, height: reference.height });
  let diffPixels = 0;

  for (let index = 0; index < total; index += 1) {
    const at = index * 4;
    const dr = Math.abs(reference.data[at] - actual.data[at]);
    const dg = Math.abs(reference.data[at + 1] - actual.data[at + 1]);
    const db = Math.abs(reference.data[at + 2] - actual.data[at + 2]);
    const da = Math.abs(reference.data[at + 3] - actual.data[at + 3]);
    const delta = Math.max(dr, dg, db, da);

    if (delta > channelTolerance) {
      diffPixels += 1;
      output.data[at] = 255;
      output.data[at + 1] = 0;
      output.data[at + 2] = 255;
      output.data[at + 3] = 255;
    } else {
      // Unchanged pixels are dimmed so the highlighted differences stand out.
      const grey = Math.round(
        (reference.data[at] + reference.data[at + 1] + reference.data[at + 2]) /
          6,
      );
      output.data[at] = grey;
      output.data[at + 1] = grey;
      output.data[at + 2] = grey;
      output.data[at + 3] = 255;
    }
  }

  return {
    comparable: true,
    aligned,
    reference: dimensions(reference),
    actual: dimensions(actual),
    diffPixels,
    totalPixels: total,
    diffRatio: total === 0 ? 0 : diffPixels / total,
    diffImage: PNG.sync.write(output),
  };
}
