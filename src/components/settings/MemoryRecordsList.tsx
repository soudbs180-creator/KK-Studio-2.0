import { Button } from "../ui/Button.tsx";
import {
  MEMORY_CONTENT_MAX_LENGTH,
  type MemoryRecord,
} from "../../features/memory/index.ts";
import { confirmAction } from "../../runtime/confirmAction";

const TYPE_LABELS: Record<string, string> = {
  user_profile: "用户画像",
  user_preference: "用户偏好",
  user_habit: "使用习惯",
  user_constraint: "用户约束",
};

const SOURCE_LABELS: Record<string, string> = {
  auto_rule: "自动学习",
  manual_codex: "Codex 提炼",
  manual_user: "手动添加",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function MemoryRecordsList({
  records,
  busy,
  cannotEdit,
  onRemove,
}: {
  records: MemoryRecord[];
  busy: boolean;
  cannotEdit: boolean;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div className="settings-memory-list">
      {records.map((record) => (
        <div className="settings-memory-item" key={record.id}>
          <div className="settings-memory-content">
            <strong>
              {record.content.slice(0, MEMORY_CONTENT_MAX_LENGTH)}
            </strong>
            <span>
              {TYPE_LABELS[record.memoryType] ?? record.memoryType} ·{" "}
              {SOURCE_LABELS[record.source] ?? record.source} ·{" "}
              {formatDate(record.createdAt)}
            </span>
          </div>
          <Button
            type="button"
            className="settings-memory-delete"
            aria-label={`删除记忆：${record.content.slice(0, 20)}`}
            disabled={busy || cannotEdit}
            onClick={async () => {
              if (await confirmAction("确认删除这条记忆？"))
                void onRemove(record.id);
            }}
          >
            删除
          </Button>
        </div>
      ))}
    </div>
  );
}
