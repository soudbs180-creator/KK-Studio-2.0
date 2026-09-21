import { useMemo, useState } from "react";
import Modal from "./Modal";

type Connector = {
  id: string;
  name: string;
  category: string;
  description: string;
  requirement: string;
};
const CONNECTORS: Connector[] = [
  {
    id: "blender",
    name: "Blender",
    category: "3D 与动画",
    description: "在本地 Blender 中创建、检查和迭代 3D 场景。",
    requirement: "需要本机安装 Blender，并安装桌面连接器。",
  },
  {
    id: "photoshop",
    name: "Photoshop",
    category: "设计工具",
    description: "读取 Photoshop 文档并把可编辑设计交给 Agent。",
    requirement: "需要本机安装 Photoshop，并安装桌面连接器。",
  },
  {
    id: "after-effects",
    name: "After Effects",
    category: "视频工具",
    description: "在本地合成工程中检查图层、时间线和动效参数。",
    requirement: "需要本机安装 After Effects，并安装桌面连接器。",
  },
  {
    id: "houdini",
    name: "Houdini",
    category: "3D 与特效",
    description: "让 Agent 读取 Houdini 工程结构和节点信息。",
    requirement: "需要本机安装 Houdini，并安装桌面连接器。",
  },
  {
    id: "touchdesigner",
    name: "TouchDesigner",
    category: "实时视觉",
    description: "检查实时视觉网络和可编辑参数。",
    requirement: "需要本机安装 TouchDesigner，并安装桌面连接器。",
  },
  {
    id: "unity",
    name: "Unity",
    category: "游戏与交互",
    description: "读取 Unity 项目资源和场景结构。",
    requirement: "需要本机安装 Unity，并安装桌面连接器。",
  },
  {
    id: "unreal",
    name: "Unreal Engine",
    category: "游戏与交互",
    description: "检查 Unreal Engine 工程中的场景和资产。",
    requirement: "需要本机安装 Unreal Engine，并安装桌面连接器。",
  },
  {
    id: "fastmoss",
    name: "FastMoss",
    category: "电商研究",
    description: "连接电商研究数据，辅助整理竞品和内容方向。",
    requirement: "需要用户配置受信任的 MCP 服务地址。",
  },
  {
    id: "apify",
    name: "Apify",
    category: "数据工具",
    description: "将受信任的本地或远程数据工具接入工作流。",
    requirement: "需要用户配置受信任的 MCP 服务地址。",
  },
  {
    id: "libtv",
    name: "LibTV",
    category: "内容研究",
    description: "连接内容研究工具并查看可发现的工具清单。",
    requirement: "需要用户配置受信任的 MCP 服务地址。",
  },
];

export default function ConnectorCatalog({
  query,
  onOpenMcp,
  onStatus,
}: {
  query: string;
  onOpenMcp?: () => void;
  onStatus: (message: string) => void;
}) {
  const [selected, setSelected] = useState<Connector | null>(null);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? CONNECTORS.filter((item) =>
          `${item.name}${item.category}${item.description}`
            .toLowerCase()
            .includes(normalized),
        )
      : CONNECTORS;
  }, [query]);
  return (
    <>
      <h2 className="catalog-section-title">连接器目录</h2>
      <div className="catalog-card-grid connector-card-grid">
        {visible.map((connector) => (
          <article className="catalog-card connector-card" key={connector.id}>
            <div className="catalog-card-image workflow-image workflow-image-0">
              <strong>{connector.name}</strong>
              <span>桌面 / MCP</span>
            </div>
            <div className="catalog-card-body">
              <strong>{connector.name}</strong>
              <p>{connector.description}</p>
              <small>{connector.category} · Prototype</small>
            </div>
            <div className="catalog-page-actions connector-card-actions">
              <button
                type="button"
                className="ui-button"
                onClick={() => setSelected(connector)}
              >
                添加连接器
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="catalog-empty" role="status">
          <strong>没有匹配的连接器</strong>
          <p>可以清空搜索后浏览全部目录。</p>
        </div>
      )}
      {selected && (
        <Modal
          className="connector-detail"
          title={`连接 ${selected.name}`}
          onClose={() => setSelected(null)}
        >
          <div className="connector-detail-header">
            <div>
              <h2>连接 {selected.name}</h2>
              <p>连接器未安装 · Prototype</p>
            </div>
            <button
              type="button"
              className="ui-button"
              onClick={() => setSelected(null)}
            >
              关闭
            </button>
          </div>
          <div className="connector-detail-body">
            <h3>准备 {selected.name}</h3>
            <p>{selected.requirement}</p>
            <p>
              安装连接器会运行本机插件或连接外部服务。KK Studio
              当前只支持显式保存并发现 Streamable HTTP
              工具，不会自动安装桌面插件或提交凭据。
            </p>
          </div>
          <div className="settings-action-group">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSelected(null);
                if (onOpenMcp) onOpenMcp();
                else onStatus("请打开设置中的 MCP 页面添加受信任的连接器。");
              }}
            >
              打开 MCP 设置
            </button>
            <button
              type="button"
              className="ui-button"
              disabled
              title="桌面连接器安装服务尚未接入"
            >
              安装连接器（未接入）
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
