import {
  Plus,
  Trash2,
  X,
  Image,
  Video,
  Music,
  FileText,
  Undo2,
  Download,
  Maximize2,
  Copy,
  Heart,
  ChevronRight,
  ArrowUpDown,
  FolderOpen,
  Pin,
  EllipsisVertical,
  Plug,
  Upload,
  FolderPlus,
  Cpu,
  Eye,
  EyeOff,
  Minus,
  Square,
  Tag,
  Pause,
  Play,
  Check,
  Search,
  Archive,
  Settings,
  ArrowUp,
} from "lucide-react";
import { getUiIconSizeName, normalizeUiIconSize } from "./uiIconSizing";

const ICONS = {
  add: Plus,
  delete: Trash2,
  close: X,
  image: Image,
  video: Video,
  audio: Music,
  text: FileText,
  undo: Undo2,
  download: Download,
  preview: Maximize2,
  copy: Copy,
  favorite: Heart,
  tag: Tag,
  next: ChevronRight,
  swapVertical: ArrowUpDown,
  folder: FolderOpen,
  pin: Pin,
  more: EllipsisVertical,
  plug: Plug,
  upload: Upload,
  folderAdd: FolderPlus,
  agent: Cpu,
  eye: Eye,
  eyeOff: EyeOff,
  minimize: Minus,
  maximize: Square,
  pause: Pause,
  play: Play,
  resume: Play,
  check: Check,
  search: Search,
  archive: Archive,
  settings: Settings,
  send: ArrowUp,
};
export type UiIconName = keyof typeof ICONS;

/** 02 Lucide masters define these aliases; all callers share the same glyphs. */
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
      <Icon size={normalizedSize} strokeWidth={1} />
    </span>
  );
}
