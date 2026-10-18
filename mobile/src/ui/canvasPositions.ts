export function canvasPositions(
  nodes: { id: string; x: number; y: number }[],
  width: number,
  height: number,
  touch: number,
) {
  const scale = Math.max(
    1,
    ...nodes.flatMap((n) => [Math.abs(n.x), Math.abs(n.y)]),
  );
  const xs = nodes.map((n) => n.x / scale),
    ys = nodes.map((n) => n.y / scale);
  const minX = Math.min(0, ...xs),
    minY = Math.min(0, ...ys),
    spanX = Math.max(Number.EPSILON, Math.max(0, ...xs) - minX),
    spanY = Math.max(Number.EPSILON, Math.max(0, ...ys) - minY);
  return new Map(
    nodes.map((n) => [
      n.id,
      {
        x: 20 + ((n.x / scale - minX) / spanX) * (width - touch - 40),
        y: 20 + ((n.y / scale - minY) / spanY) * (height - touch - 40),
      },
    ]),
  );
}
