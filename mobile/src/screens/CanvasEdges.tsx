import { useState } from "react";
import type { MobileCanvasEdge } from "../core/mobileModel.ts";
import { Action, Card, Field, Label, Row } from "../ui/primitives.tsx";
import { View } from "react-native";
export function CanvasEdges({
  edges,
  onRemove,
}: {
  edges: MobileCanvasEdge[];
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const filtered = edges.filter((e) =>
    `${e.id} ${e.source} ${e.target}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 50)),
    index = Math.min(page, pages - 1);
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="筛选画布连接"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setPage(0);
        }}
        maxLength={256}
      />
      <Label muted>
        共 {filtered.length} 条连接 · 第 {index + 1}/{pages} 页
      </Label>
      {filtered.slice(index * 50, index * 50 + 50).map((e) => (
        <Card key={e.id}>
          <Label small>
            {e.source} → {e.target}
          </Label>
          <Action label="暂存移除此连接" onPress={() => onRemove(e.id)} />
        </Card>
      ))}
      <Row>
        <Action
          label="上一页连接"
          disabled={index === 0}
          onPress={() => setPage(index - 1)}
        />
        <Action
          label="下一页连接"
          disabled={index + 1 >= pages}
          onPress={() => setPage(index + 1)}
        />
      </Row>
    </View>
  );
}
