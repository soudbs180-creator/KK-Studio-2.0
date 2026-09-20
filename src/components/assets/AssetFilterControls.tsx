import type { AssetFilter } from "../../domain/assets";

export default function AssetFilterControls({
  filter,
  tags,
  sourceFilter,
  onFilter,
  onSource,
}: {
  filter: AssetFilter;
  tags: string[];
  sourceFilter: string;
  onFilter: (patch: Partial<AssetFilter>) => void;
  onSource: (value: string) => void;
}) {
  return (
    <div className="asset-filters">
      <select
        aria-label="类型筛选"
        value={filter.type}
        onChange={(e) => onFilter({ type: e.target.value })}
      >
        <option value="all">类型</option>
        <option value="image">图片</option>
        <option value="video">视频</option>
        <option value="subject">主体</option>
      </select>
      <select
        aria-label="标签筛选"
        value={filter.tag}
        onChange={(e) => onFilter({ tag: e.target.value })}
      >
        <option value="all">标签</option>
        {tags.map((tag) => (
          <option key={tag}>{tag}</option>
        ))}
      </select>
      <select
        aria-label="时间筛选"
        value={filter.days}
        onChange={(e) => onFilter({ days: Number(e.target.value) })}
      >
        <option value="0">时间</option>
        <option value="1">最近一天</option>
        <option value="7">最近七天</option>
        <option value="30">最近一月</option>
      </select>
      <select
        aria-label="来源筛选"
        value={sourceFilter}
        onChange={(e) => onSource(e.target.value)}
      >
        <option value="all">来源</option>
        <option value="provider">AI 生成</option>
        <option value="upload">本地导入</option>
        <option value="demo">设计示例</option>
        <option value="collection">本地集合</option>
      </select>
    </div>
  );
}
