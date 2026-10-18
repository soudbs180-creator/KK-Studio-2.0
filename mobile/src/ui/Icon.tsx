import { View } from "react-native";
import { useTheme } from "./theme.tsx";

export type IconName =
  | "menu"
  | "plus"
  | "newChat"
  | "back"
  | "chevron"
  | "close"
  | "send"
  | "pause"
  | "image"
  | "folder"
  | "search"
  | "sliders"
  | "sparkles"
  | "clock"
  | "copy"
  | "share"
  | "check"
  | "more"
  | "extensions"
  | "microphone";

// Small original line drawings use RN views, avoiding an extra native dependency.
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const theme = useTheme(),
    ink = color ?? theme.text,
    scale = size / 24;
  function line(x1: number, y1: number, x2: number, y2: number, key: string) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    return (
      <View
        key={key}
        style={{
          position: "absolute",
          left: ((x1 + x2 - length) / 2) * scale,
          top: ((y1 + y2) / 2 - 0.85) * scale,
          width: length * scale,
          height: 1.7 * scale,
          borderRadius: 2,
          backgroundColor: ink,
          transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
        }}
      />
    );
  }
  function box(
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 3,
    key = "box",
  ) {
    return (
      <View
        key={key}
        style={{
          position: "absolute",
          left: x * scale,
          top: y * scale,
          width: width * scale,
          height: height * scale,
          borderWidth: 1.7 * scale,
          borderColor: ink,
          borderRadius: radius * scale,
        }}
      />
    );
  }
  let shapes;
  switch (name) {
    case "menu":
      shapes = [box(4, 3, 16, 18), line(9, 3, 9, 21, "divider")];
      break;
    case "plus":
      shapes = [line(12, 4, 12, 20, "v"), line(4, 12, 20, 12, "h")];
      break;
    case "newChat":
      shapes = [
        box(3, 5, 15, 14),
        line(16, 3, 22, 3, "h"),
        line(19, 0, 19, 6, "v"),
        line(6, 18, 3, 22, "tail"),
      ];
      break;
    case "back":
      shapes = [
        line(4, 12, 20, 12, "h"),
        line(4, 12, 10, 6, "a"),
        line(4, 12, 10, 18, "b"),
      ];
      break;
    case "chevron":
      shapes = [line(7, 9, 12, 14, "a"), line(12, 14, 17, 9, "b")];
      break;
    case "close":
      shapes = [line(6, 6, 18, 18, "a"), line(6, 18, 18, 6, "b")];
      break;
    case "send":
      shapes = [
        line(12, 20, 12, 4, "stem"),
        line(12, 4, 5, 11, "a"),
        line(12, 4, 19, 11, "b"),
      ];
      break;
    case "pause":
      shapes = [line(8, 5, 8, 19, "a"), line(16, 5, 16, 19, "b")];
      break;
    case "image":
      shapes = [
        box(3, 3, 18, 18),
        box(6, 6, 4, 4, 2, "sun"),
        line(4, 18, 11, 11, "a"),
        line(11, 11, 20, 20, "b"),
      ];
      break;
    case "folder":
      shapes = [
        box(3, 7, 18, 14),
        line(3, 7, 3, 4, "a"),
        line(3, 4, 10, 4, "b"),
        line(10, 4, 13, 7, "c"),
      ];
      break;
    case "search":
      shapes = [box(3, 3, 13, 13, 8), line(15, 15, 21, 21, "handle")];
      break;
    case "sliders":
      shapes = [
        line(4, 7, 20, 7, "a"),
        line(4, 17, 20, 17, "b"),
        box(7, 4, 5, 6, 3, "one"),
        box(14, 14, 5, 6, 3, "two"),
      ];
      break;
    case "sparkles":
      shapes = [
        line(12, 3, 15, 9, "a"),
        line(15, 9, 21, 12, "b"),
        line(21, 12, 15, 15, "c"),
        line(15, 15, 12, 21, "d"),
        line(12, 21, 9, 15, "e"),
        line(9, 15, 3, 12, "f"),
        line(3, 12, 9, 9, "g"),
        line(9, 9, 12, 3, "h"),
      ];
      break;
    case "clock":
      shapes = [
        box(3, 3, 18, 18, 12),
        line(12, 6, 12, 12, "a"),
        line(12, 12, 16, 14, "b"),
      ];
      break;
    case "copy":
      shapes = [box(3, 3, 13, 14, 2, "back"), box(8, 8, 13, 14, 2, "front")];
      break;
    case "share":
      shapes = [
        line(12, 15, 12, 3, "a"),
        line(12, 3, 7, 8, "b"),
        line(12, 3, 17, 8, "c"),
        line(5, 12, 5, 21, "d"),
        line(5, 21, 19, 21, "e"),
        line(19, 21, 19, 12, "f"),
      ];
      break;
    case "check":
      shapes = [line(5, 12, 10, 17, "a"), line(10, 17, 20, 6, "b")];
      break;
    case "extensions":
      shapes = [
        box(3, 3, 7, 7, 2, "a"),
        box(14, 3, 7, 7, 2, "b"),
        box(3, 14, 7, 7, 2, "c"),
        box(14, 14, 7, 7, 2, "d"),
      ];
      break;
    case "microphone":
      shapes = [
        box(9, 2, 6, 12, 3),
        line(5, 10, 5, 14, "a"),
        line(5, 14, 9, 18, "b"),
        line(9, 18, 15, 18, "c"),
        line(15, 18, 19, 14, "d"),
        line(19, 14, 19, 10, "e"),
        line(12, 18, 12, 22, "f"),
        line(8, 22, 16, 22, "g"),
      ];
      break;
    case "more":
      shapes = [5, 12, 19].map((x) => (
        <View
          key={x}
          style={{
            position: "absolute",
            left: (x - 1.5) * scale,
            top: 10.5 * scale,
            width: 3 * scale,
            height: 3 * scale,
            borderRadius: 2,
            backgroundColor: ink,
          }}
        />
      ));
      break;
  }
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      {shapes}
    </View>
  );
}
