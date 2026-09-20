import { DEMO_MEDIA } from "../../domain/demoMedia";
import type { DemoResult } from "../../domain/canvasItems";
import Modal from "../Modal";
import UiIcon from "../UiIcon";

export default function DemoLibrary({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (results: DemoResult[]) => void;
}) {
  return (
    <Modal title="示范素材" onClose={onClose} className="demo-library-modal">
      <header>
        <div>
          <p className="demo-eyebrow">KK STUDIO / 示例工作流</p>
          <h2>让创作流程真正跑起来</h2>
          <p>前端示范，不消耗积分</p>
        </div>
        <button
          className="ui-button"
          aria-label="关闭示范素材"
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="demo-library-grid">
        {DEMO_MEDIA.map((sample) => (
          <article key={sample.id}>
            <div className={`demo-library-cover is-${sample.kind}`}>
              {sample.poster ? (
                <img src={sample.poster} alt="" />
              ) : (
                <UiIcon name={sample.kind} size={46} />
              )}
              <span>
                <UiIcon name={sample.kind} />
              </span>
            </div>
            <h3>{sample.title}</h3>
            <p>{sample.description}</p>
            <button
              className="ui-button"
              aria-label={`添加${sample.title}`}
              onClick={() => onAdd([sample])}
            >
              <UiIcon name="add" />
              放入画布
            </button>
          </article>
        ))}
      </div>
      <footer>
        <p>图片、短视频、音频与可编辑文案，素材仅加入当前页面会话。</p>
        <button className="ui-button" onClick={() => onAdd(DEMO_MEDIA)}>
          添加全部示范
          <UiIcon name="next" />
        </button>
      </footer>
    </Modal>
  );
}
