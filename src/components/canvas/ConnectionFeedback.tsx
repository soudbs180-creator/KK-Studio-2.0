export default function ConnectionFeedback({
  onUndo,
  onDismiss,
}: {
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="canvas-feedback"
      role="status"
      onPointerDown={(event) => event.stopPropagation()}
    >
      连线已删除，两端卡片已保留
      <button aria-label="撤销删除连线" onClick={onUndo}>
        撤销
      </button>
      <button aria-label="关闭连线提示" onClick={onDismiss}>
        关闭
      </button>
    </div>
  );
}
