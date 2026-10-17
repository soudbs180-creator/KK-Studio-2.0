import { Action, Row } from "../ui/primitives.tsx";
export type MaterialKind =
  "all" | "image" | "video" | "audio" | "text" | "file";
const labels: Record<MaterialKind, string> = {
  all: "全部",
  image: "图片",
  video: "视频",
  audio: "音频",
  text: "文字",
  file: "其他文件",
};
export function MaterialFilters({
  kind,
  onKind,
  favorites,
  onFavorites,
  grid,
  onGrid,
  gridReason,
}: {
  kind: MaterialKind;
  onKind: (kind: MaterialKind) => void;
  favorites: boolean;
  onFavorites: () => void;
  grid: boolean;
  onGrid: () => void;
  gridReason?: string;
}) {
  return (
    <>
      <Row>
        {(Object.keys(labels) as MaterialKind[]).map((k) => (
          <Action
            compact
            key={k}
            selected={kind === k}
            label={labels[k]}
            onPress={() => onKind(k)}
          />
        ))}
      </Row>
      <Row>
        <Action
          compact
          selected={favorites}
          label="仅收藏"
          onPress={onFavorites}
        />
        <Action
          compact
          selected={grid}
          label={grid ? "网格视图" : "列表视图"}
          onPress={onGrid}
          disabled={Boolean(gridReason)}
          reason={gridReason}
        />
      </Row>
    </>
  );
}
export function materialMatches(mime: string, kind: MaterialKind) {
  if (kind === "all") return true;
  if (kind === "file")
    return !["image/", "video/", "audio/", "text/"].some((prefix) =>
      mime.startsWith(prefix),
    );
  return mime.startsWith(`${kind}/`);
}
