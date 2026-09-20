export default function CanvasMarquee({
  rect,
}: {
  rect: { x: number; y: number; width: number; height: number } | null;
}) {
  return (
    <>
      <p id="canvas-drag-help" className="visually-hidden">
        左键拖动空白处框选，中键或右键拖动画布；拖动卡片可移动，卡片聚焦后可用方向键微调。
      </p>
      {rect && (
        <div
          className="canvas-marquee"
          data-testid="canvas-marquee"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}
    </>
  );
}
