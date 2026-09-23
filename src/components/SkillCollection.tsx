import type {
  SkillRecord,
  SkillRegistry,
} from "../features/skills/skillRegistry";
import SkillRecordCard from "./SkillRecordCard";

export default function SkillCollection({
  records,
  category,
  tab,
  registry,
  onCategory,
  onApply,
  onEdit,
  onExport,
  onStatus,
}: {
  records: SkillRecord[];
  category: string;
  tab: "catalog" | "mine";
  registry: SkillRegistry;
  onCategory: (value: string) => void;
  onApply?: (record: SkillRecord) => string | void;
  onEdit: (record: SkillRecord) => void;
  onExport: (record: SkillRecord) => void;
  onStatus: (message: string) => void;
}) {
  const categories = [
    "全部",
    ...new Set(records.map((record) => record.manifest.category)),
  ];
  return (
    <>
      <div className="catalog-categories" role="group" aria-label="Skill分类">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className="ui-capsule"
            aria-pressed={category === item}
            onClick={() => onCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <h2 className="catalog-section-title">
        {tab === "mine" ? "我的 Skill" : "本地模板与已导入"}
      </h2>
      <div className="catalog-card-grid">
        {records.map((record) => (
          <SkillRecordCard
            key={record.manifest.id}
            record={record}
            registry={registry}
            onApply={onApply}
            onEdit={onEdit}
            onExport={onExport}
            onStatus={onStatus}
          />
        ))}
      </div>
      {!records.length && (
        <div className="catalog-empty" role="status">
          <strong>没有匹配的 Skill</strong>
          <p>可以新建本地模板，或导入受限的 JSON / SKILL.md。</p>
        </div>
      )}
    </>
  );
}
