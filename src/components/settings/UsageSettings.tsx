import type { CreationProject } from "../../features/creation/index.ts";
import type { SaveState } from "../../features/creation/index.ts";
import { summarizeUsage } from "../../features/creation/index.ts";

export default function UsageSettings({
  projects,
  saveState,
}: {
  projects: readonly CreationProject[];
  saveState: SaveState;
}) {
  if (saveState === "loading")
    return (
      <p className="settings-section-intro" role="status">
        正在读取本机项目记录…
      </p>
    );
  if (saveState === "read_error")
    return (
      <p className="settings-section-intro" role="alert">
        项目记录未能读取，使用信息暂不可用。请先处理项目恢复提示。
      </p>
    );
  const usage = summarizeUsage(projects);
  const saved = saveState === "saved";
  const resultCount = (kind: "image" | "video" | "text") =>
    usage.outputs[kind] === 0 && usage.unreportedOutputs[kind]
      ? "未报告"
      : usage.outputs[kind] + " 个已记录";
  return (
    <div className="settings-detail-stack" data-usage-state={saveState}>
      <p className="settings-section-intro" role={saved ? undefined : "status"}>
        {saved
          ? "来自当前设备已保存的项目记录。"
          : "当前记录包含尚未确认保存的更改；保存成功后再核对使用信息。"}
      </p>
      <h3 className="settings-detail-label">项目与任务</h3>
      <div className="settings-detail-card">
        <div>
          <span>{saved ? "已保存项目" : "当前项目记录"}</span>
          <strong>{usage.projectCount} 个</strong>
        </div>
        <div>
          <span>任务记录</span>
          <strong>{usage.taskCount} 个</strong>
        </div>
        <div>
          <span>成功任务</span>
          <strong>{usage.succeededTasks} 个</strong>
        </div>
        <div>
          <span>失败任务</span>
          <strong>{usage.failedTasks} 个</strong>
        </div>
        <div>
          <span>其他任务状态</span>
          <strong>{usage.unfinishedTasks} 个</strong>
        </div>
        <div>
          <span>已取消任务</span>
          <strong>{usage.cancelledTasks} 个</strong>
        </div>
      </div>
      <p className="settings-section-intro">
        包括待处理、处理中、部分完成、离线和待核对记录；部分完成不表示仍在运行。
      </p>
      <h3 className="settings-detail-label">已存成功结果</h3>
      <div className="settings-detail-card">
        <div>
          <span>图片</span>
          <strong>{resultCount("image")}</strong>
        </div>
        <div>
          <span>视频</span>
          <strong>{resultCount("video")}</strong>
        </div>
        <div>
          <span>文案</span>
          <strong>{resultCount("text")}</strong>
        </div>
      </div>
      <p className="settings-section-intro">
        只记录当前项目内有成功回执的供应商结果卡。演示素材、输入素材和未确认的结果不计入；未记录的历史生成量不作推算。
      </p>
      <h3 className="settings-detail-label">消耗记录</h3>
      <div className="settings-detail-card">
        <div>
          <span>Token 用量</span>
          <strong>未报告</strong>
        </div>
        <div>
          <span>已报告的 USD 费用</span>
          <strong>
            {usage.actualUsd === undefined
              ? "未报告"
              : "$ " + usage.actualUsd.toFixed(2)}
          </strong>
        </div>
        <div>
          <span>有效费用回执</span>
          <strong>{usage.receiptCount} 条</strong>
        </div>
      </div>
      <p className="settings-section-intro">
        仅合计当前记录中完整绑定任务的 USD
        供应商实际回执。估算、演示、其他币种和冲突回执未纳入；这里不代表供应商账户的完整账单。
      </p>
    </div>
  );
}
