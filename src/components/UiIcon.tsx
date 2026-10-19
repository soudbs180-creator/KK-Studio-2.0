import {
  Add,
  Trash,
  CloseCircle,
  Image,
  VideoPlay,
  Music,
  DocumentText,
  ArrowRotateLeft,
  ExportCurve,
  Maximize,
  Copy,
  Heart,
  ArrowRight2,
  ArrowUp,
  FolderOpen,
  Location,
  More2,
  Link1,
  Export,
  FolderAdd,
  Cpu,
  Eye,
  EyeSlash,
  Minus,
  Stop,
  Hashtag,
  Pause,
  Play,
  Check,
  ArchiveBox,
  ElementPlus,
  Hierarchy,
  MessageText,
  ClipboardText,
  SearchNormal1,
  ArrowLeft2,
  Setting2,
} from "iconsax-react";
import { getUiIconSizeName, normalizeUiIconSize } from "./uiIconSizing";

const ICONS = {
  add: Add,
  delete: Trash,
  close: CloseCircle,
  image: Image,
  video: VideoPlay,
  audio: Music,
  text: DocumentText,
  undo: ArrowRotateLeft,
  download: ExportCurve,
  preview: Maximize,
  copy: Copy,
  favorite: Heart,
  tag: Hashtag,
  next: ArrowRight2,
  send: ArrowUp,
  folder: FolderOpen,
  pin: Location,
  more: More2,
  plug: Link1,
  upload: Export,
  folderAdd: FolderAdd,
  agent: Cpu,
  eye: Eye,
  eyeOff: EyeSlash,
  minimize: Minus,
  maximize: Stop,
  pause: Pause,
  play: Play,
  resume: Play,
  check: Check,
  archive: ArchiveBox,
  extensions: ElementPlus,
  workflow: Hierarchy,
  chat: MessageText,
  tasks: ClipboardText,
  search: SearchNormal1,
  previous: ArrowLeft2,
  settings: Setting2,
};
export type UiIconName = keyof typeof ICONS;

/** Shared supplemental icon set. Source Figma exports remain authoritative. */
export default function UiIcon({
  name,
  size = 20,
}: {
  name: UiIconName;
  size?: number;
}) {
  const Icon = ICONS[name];
  const normalizedSize = normalizeUiIconSize(size);
  return (
    <span
      className="ui-icon kk-icon-slot"
      data-size={getUiIconSizeName(normalizedSize)}
      aria-hidden="true"
    >
      <Icon variant="Linear" color="currentColor" size={normalizedSize} />
    </span>
  );
}
