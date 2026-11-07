import { Image } from "react-native";
import { useTheme } from "./theme.tsx";

const sources = {
  microphone: require("../../assets/figma-icons/microphone.png"),
  extensions: require("../../assets/figma-icons/extensions.png"),
  menu: require("../../assets/figma-icons/menu.png"),
  plus: require("../../assets/figma-icons/plus.png"),
  newChat: require("../../assets/figma-icons/newChat.png"),
  back: require("../../assets/figma-icons/back.png"),
  chevron: require("../../assets/figma-icons/chevron.png"),
  close: require("../../assets/figma-icons/close.png"),
  send: require("../../assets/figma-icons/send.png"),
  pause: require("../../assets/figma-icons/pause.png"),
  image: require("../../assets/figma-icons/image.png"),
  folder: require("../../assets/figma-icons/folder.png"),
  search: require("../../assets/figma-icons/search.png"),
  sliders: require("../../assets/figma-icons/sliders.png"),
  sparkles: require("../../assets/figma-icons/sparkles.png"),
  clock: require("../../assets/figma-icons/clock.png"),
  copy: require("../../assets/figma-icons/copy.png"),
  share: require("../../assets/figma-icons/share.png"),
  check: require("../../assets/figma-icons/check.png"),
  more: require("../../assets/figma-icons/more.png"),
} as const;

export type IconName = keyof typeof sources;

// Figma 02 exports at 8x; current glyphs stay sharp through 48px at 4x DPR.
export function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Image
      source={sources[name]}
      accessible={false}
      resizeMode="contain"
      style={{ width: size, height: size, tintColor: color ?? theme.text }}
    />
  );
}
