import UiIcon from "./UiIcon";
export default function InfoPanel({
  view,
  onClose,
  onConfigure,
}: {
  view: string;
  onClose: () => void;
  onConfigure: () => void;
}) {
  return (
    <section className="info-panel">
      <header>
        <h2>{view === "tasks" ? "任务列表" : "使用说明"}</h2>
        <button
          type="button"
          className="ui-icon-button"
          aria-label="关闭"
          onClick={onClose}
        >
          <UiIcon name="close" size={20} />
        </button>
      </header>
      {view === "tasks" ? (
        <div className="library-empty">
          <h3>还没有生成任务</h3>
          <p>连接模型接入后，可从画布提交生成任务。</p>
          <button className="primary-button" onClick={onConfigure}>
            配置模型接入
          </button>
        </div>
      ) : (
        <div className="help-copy">
          <p>
            左键拖动画布空白处框选，中键或右键拖动平移，滚轮缩放。V
            切换选择工具，H 切换抓手，Space
            按住临时平移。点击卡片才显示编辑器；拖动卡片可移动，方向键微调。底部“＋”新增图片或视频卡片；新增卡片聚焦后可按
            Delete 删除。
          </p>
          <p>
            在画布中上传参考图片，填写创作描述，再选择模型、比例与生成数量。
          </p>
          <p>
            底部文件夹打开资产管理。你可以搜索、筛选、查看资源，也可以在“资产”中创建主体并导入本地图片。
          </p>
          <p>
            点左下角设置调整主题与布局偏好。按 Escape 关闭弹窗，Tab 切换控件。
          </p>
          <p>
            项目、对话与素材仅保存在当前设备；配置好自带 Key 的模型接入后即可提交图片任务。演示结果为本机生成，可直接继续创作。
          </p>
        </div>
      )}
    </section>
  );
}
