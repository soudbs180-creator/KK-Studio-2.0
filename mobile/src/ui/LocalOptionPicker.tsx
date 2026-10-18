import { useState } from "react";
import { Action, Field, Label, Row } from "./primitives.tsx";
import { Sheet } from "./Sheet.tsx";
export function LocalOptionPicker({
  title,
  options,
  selected,
  onSelect,
  onClose,
  open = true,
}: {
  title: string;
  options: { id: string; label: string }[];
  selected?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  open?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const filtered = options.filter((o) =>
    `${o.label} ${o.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 50)),
    index = Math.min(page, pages - 1);
  return (
    <Sheet title={title} open={open} onClose={onClose}>
      <Field
        label="筛选名称或标识"
        value={query}
        maxLength={256}
        onChangeText={(value) => {
          setQuery(value);
          setPage(0);
        }}
      />
      <Label muted>
        共 {filtered.length} 项 · 第 {index + 1}/{pages} 页
      </Label>
      {!filtered.length && <Label muted>没有匹配内容。</Label>}
      {filtered.slice(index * 50, index * 50 + 50).map((o) => (
        <Action
          key={o.id}
          selected={selected === o.id}
          label={o.label}
          onPress={() => onSelect(o.id)}
        />
      ))}
      <Row>
        <Action
          label="上一页"
          disabled={index === 0}
          onPress={() => setPage(index - 1)}
        />
        <Action
          label="下一页"
          disabled={index + 1 >= pages}
          onPress={() => setPage(index + 1)}
        />
      </Row>
    </Sheet>
  );
}
