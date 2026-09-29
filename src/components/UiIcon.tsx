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
  FolderOpen,
  Location,
  More2,
  Link1,
  Export,
  FolderAdd,
  Eye,
  EyeSlash,
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
  next: ArrowRight2,
  folder: FolderOpen,
  pin: Location,
  more: More2,
  plug: Link1,
  upload: Export,
  folderAdd: FolderAdd,
  eye: Eye,
  eyeOff: EyeSlash,
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
