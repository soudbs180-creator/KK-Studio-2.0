import { useRef } from "react";
import UiIcon from "./UiIcon";
import StartMediaControls, {
  type StartMediaControlsProps,
} from "./StartMediaControls";
import { useComposerMenus } from "./useComposerMenus";
import { VoiceInputButton } from "../features/speech/index.ts";

type CompactProps = Omit<StartMediaControlsProps, "placement"> & {
  onPromptChange: (prompt: string) => void;
};

/** Figma 719:11857 keeps the phone action row to add, model, more and send. */
export default function StartCompactTools({ menus, ...props }: CompactProps) {
  return (
    <div className="start-compact-tools" data-figma-node="1096:62948">
      <button
        type="button"
        className="start-more-button"
        aria-label="更多创作选项"
        aria-haspopup="dialog"
        aria-expanded={menus.moreMenuOpen}
        disabled={props.disabled}
        onClick={() => menus.toggleMenu("more")}
      >
        <UiIcon name="ellipsis" size={16} />
      </button>
      {menus.moreMenuOpen && (
        <div
          className="start-compact-popover"
          role="dialog"
          aria-label="更多创作选项"
        >
          <StartCompactOptions {...props} />
        </div>
      )}
    </div>
  );
}

function StartCompactOptions({
  onPromptChange,
  ...props
}: Omit<CompactProps, "menus">) {
  const controls = useRef<HTMLDivElement>(null);
  const menus = useComposerMenus(controls);
  return (
    <div ref={controls} className="start-compact-controls">
      <StartMediaControls {...props} menus={menus} placement="left" />
      <StartMediaControls {...props} menus={menus} placement="right" />
      <VoiceInputButton
        enabled={!props.disabled}
        value={props.draft.prompt}
        onChange={onPromptChange}
        onStatus={props.onStatus}
        maxLength={4000}
        idleIcon={<UiIcon name="mic" size={16} />}
        activeIcon={<UiIcon name="mic-off" size={16} />}
      />
    </div>
  );
}
