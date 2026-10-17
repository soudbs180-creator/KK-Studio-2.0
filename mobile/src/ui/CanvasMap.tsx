import { Pressable, View, useWindowDimensions } from "react-native";
import type { MobileProject } from "../core/mobileModel.ts";
import { useTheme, touchTarget } from "./theme.tsx";
import { radii } from "./geometry.ts";
import { Label } from "./primitives.tsx";
import { canvasPositions } from "./canvasPositions.ts";
export function CanvasMap({
  canvas,
  selected,
  onSelect,
}: {
  canvas: MobileProject["canvas"];
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const theme = useTheme(),
    dimensions = useWindowDimensions();
  const width = Math.max(200, Math.min(600, dimensions.width - 64)),
    height = 260;
  const nodes = canvas.nodes.slice(0, 100);
  const positions = canvasPositions(nodes, width, height, touchTarget);
  return (
    <>
      <Label muted small>
        节点概览自动缩放，最多显示前 100
        个；实际坐标与视口保留，完整内容可在节点列表查看。
      </Label>
      <View
        style={{
          width: "100%",
          height,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: radii.card,
          overflow: "hidden",
          backgroundColor: theme.pageSurface,
        }}
      >
        {canvas.edges.map((e) => {
          const a = positions.get(e.source),
            b = positions.get(e.target);
          if (!a || !b) return null;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            length = Math.sqrt(dx * dx + dy * dy);
          return (
            <View
              key={e.id}
              style={{
                position: "absolute",
                left: (a.x + b.x + touchTarget - length) / 2,
                top: (a.y + b.y + touchTarget) / 2,
                width: length,
                height: 2,
                backgroundColor: theme.border,
                transform: [
                  { rotate: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg` },
                ],
              }}
            />
          );
        })}
        {nodes.map((n, index) => {
          const point = positions.get(n.id)!;
          return (
            <Pressable
              key={n.id}
              onPress={() => onSelect?.(n.id)}
              disabled={!onSelect}
              accessibilityRole={onSelect ? "button" : undefined}
              accessibilityLabel={`选择节点 ${index + 1} ${n.kind}`}
              accessibilityState={{
                selected: selected === n.id,
                disabled: !onSelect,
              }}
              style={{
                position: "absolute",
                left: point.x,
                top: point.y,
                minWidth: touchTarget,
                minHeight: touchTarget,
                padding: 8,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.control,
                borderWidth: 1,
                borderColor: selected === n.id ? theme.accent : theme.border,
                backgroundColor:
                  selected === n.id ? theme.selected : theme.surface,
              }}
            >
              <Label small>{index + 1}</Label>
            </Pressable>
          );
        })}
        {!nodes.length && (
          <View style={{ padding: 24 }}>
            <Label muted>画布为空，添加节点编辑并创建待批准提案。</Label>
          </View>
        )}
      </View>
    </>
  );
}
