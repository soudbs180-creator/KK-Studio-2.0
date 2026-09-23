export default function ConversationTaskApproval({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="chat-approval" role="group" aria-label="确认执行任务">
      <span>将使用当前项目模型执行这条任务。</span>
      <button type="button" onClick={onConfirm}>
        确认执行
      </button>
      <button type="button" onClick={onCancel}>
        取消
      </button>
    </div>
  );
}
