import Modal from "./Modal";

export default function CatalogTutorial({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <Modal title="项目库使用教程" onClose={onClose}>
      <section
        className="catalog-tutorial"
        aria-labelledby="catalog-tutorial-title"
      >
        <header className="catalog-tutorial-header">
          <div>
            <h2 id="catalog-tutorial-title">项目库使用教程</h2>
            <p>从项目库找到项目，再回到无限画布继续创作。</p>
          </div>
          <button
            type="button"
            className="ui-button"
            data-initial-focus
            onClick={onClose}
          >
            关闭
          </button>
        </header>
        <ol className="catalog-tutorial-steps">
          <li>
            <strong>选择项目</strong>
            <span>点击本地项目卡片即可打开对应的无限画布。</span>
          </li>
          <li>
            <strong>整理项目</strong>
            <span>
              使用“新建文件夹”整理本地项目；上传文件服务接入后才会启用上传入口。
            </span>
          </li>
          <li>
            <strong>继续创作</strong>
            <span>
              在画布中添加节点、编辑提示词，并使用已配置模型继续执行任务。
            </span>
          </li>
        </ol>
        <p className="catalog-tutorial-note" role="status">
          当前版本是前端
          Prototype。云端保存、账号同步和文件上传尚未接入，不会伪造成功状态。
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            onClose();
            onOpen("landing");
          }}
        >
          立即新建项目
        </button>
      </section>
    </Modal>
  );
}
