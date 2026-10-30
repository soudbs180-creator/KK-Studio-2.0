import UiIcon from "../UiIcon";
import type { RefObject } from "react";
import type { AssetArchiveState } from "../../features/creation/index.ts";

interface AssetActionsProps {
  showSubjectActions: boolean;
  busy: boolean;
  onCreate: () => void;
  input: RefObject<HTMLInputElement>;
  onImportFiles: (files: FileList | null) => Promise<void>;
  message: string;
  archive?: AssetArchiveState;
}

export default function AssetActions({
  showSubjectActions,
  busy,
  onCreate,
  input,
  onImportFiles,
  message,
  archive,
}: AssetActionsProps) {
  return (
    <>
      {showSubjectActions && (
        <div className="asset-bottom-actions">
          <button className="kk-button kk-button--primary" onClick={onCreate}>
            <UiIcon name="add" size={12} />
            创建主体
          </button>
          <button
            className="kk-button kk-button--secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <UiIcon name="upload" size={12} />
            {busy ? "正在导入" : "导入资源包"}
          </button>
        </div>
      )}
      <input
        className="visually-hidden"
        tabIndex={-1}
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,.json"
        onChange={(e) => void onImportFiles(e.target.files)}
      />
      {(message || archive?.loading || archive?.error) && (
        <p
          className="asset-feedback"
          role={archive?.error ? "alert" : "status"}
        >
          {archive?.loading ? "正在读取本地素材库… " : archive?.error}
          {archive?.error && (
            <button className="ui-button" type="button" onClick={archive.retry}>
              重新读取素材库
            </button>
          )}
          {message}
        </p>
      )}
    </>
  );
}
