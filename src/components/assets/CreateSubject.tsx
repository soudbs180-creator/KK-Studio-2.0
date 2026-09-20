import Modal from "../Modal";
export default function CreateSubject({
  name,
  setName,
  onClose,
  onSubmit,
}: {
  name: string;
  setName: (name: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Modal title="创建主体" onClose={onClose} className="create-modal">
      <div className="asset-create">
        <form onSubmit={onSubmit}>
          <h3>创建主体</h3>
          <p>将角色、产品或场景整理为可复用的主体。</p>
          <label>
            主体名称
            <input
              autoFocus
              maxLength={60}
              placeholder="例如：品牌代言人"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="muted">保存在本次会话中，可继续添加参考图片。</p>
          <div>
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button
              className="primary-button"
              disabled={!name.trim()}
              type="submit"
            >
              创建主体
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
