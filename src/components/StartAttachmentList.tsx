import type { CreationAttachment } from "../features/creation/model";

export default function StartAttachmentList({
  attachments,
  onRemove,
}: {
  attachments: CreationAttachment[];
  onRemove: (id: string) => void;
}) {
  if (!attachments.length) return null;
  return (
    <div className="start-attachment-row" aria-label="已添加的参考素材">
      {attachments.map((attachment) => (
        <span key={attachment.id} className="start-attachment-chip">
          <img src={attachment.dataUrl} alt="" />
          <span title={attachment.name}>{attachment.name}</span>
          <button
            type="button"
            aria-label={`移除素材 ${attachment.name}`}
            onClick={() => onRemove(attachment.id)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
