import { useEffect, useState } from "react";
import {
  catalogForConnection,
  saveModelCatalog,
  type ModelKind,
} from "../../features/models/modelCatalog";
import { connectionFromModelProfile } from "../../features/creation/providerRegistry";
import {
  modelProviderSchema,
  type ModelProviderProfile,
} from "../../domain/modelProvider";

export default function ProviderModelCatalog({
  profile,
  onSelect,
  onRefresh,
  loading,
}: {
  profile: ModelProviderProfile;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const connection = connectionFromModelProfile(profile);
  const [revision, setRevision] = useState(0);
  const models = catalogForConnection(connection);
  const selected = models.find((model) => model.id === profile.model);
  const [kind, setKind] = useState<ModelKind>(selected?.kind ?? "unknown");
  const [sizes, setSizes] = useState(selected?.sizes?.join(", ") ?? "");
  const [family, setFamily] = useState(selected?.family ?? "");
  const [variant, setVariant] = useState(selected?.variant ?? "");
  const [aliases, setAliases] = useState(selected?.aliases?.join(", ") ?? "");
  const [status, setStatus] = useState("");
  useEffect(() => {
    const update = () => setRevision((value) => value + 1);
    window.addEventListener("kk:model-provider-changed", update);
    return () =>
      window.removeEventListener("kk:model-provider-changed", update);
  }, []);
  useEffect(() => {
    setKind(selected?.kind ?? "unknown");
    setSizes(selected?.sizes?.join(", ") ?? "");
    setFamily(selected?.family ?? "");
    setVariant(selected?.variant ?? "");
    setAliases(selected?.aliases?.join(", ") ?? "");
    setStatus("");
  }, [
    profile.model,
    profile.baseUrl,
    profile.name,
    revision,
    selected?.kind,
    selected?.sizes?.join(", "),
  ]);
  function save() {
    const valid = modelProviderSchema.safeParse(profile);
    if (!valid.success) {
      setStatus(valid.error.issues[0]?.message ?? "请检查供应商配置。");
      return;
    }
    const values = sizes.split(/[,，\s]+/).filter(Boolean);
    if (
      values.some((value) => !/^([1-9]\d{1,4})x([1-9]\d{1,4})$/.test(value))
    ) {
      setStatus("尺寸请填写宽x高，例如 1024x1024；多个尺寸用逗号分隔。");
      return;
    }
    const model = {
      id: profile.model,
      family: family.trim() || undefined,
      variant: variant.trim() || undefined,
      aliases: aliases
        .split(/[,，]/)
        .map((value) => value.trim())
        .filter(Boolean),
      kind,
      sizes: kind === "image" ? [...new Set(values)] : undefined,
      source: "manual" as const,
    };
    try {
      saveModelCatalog(
        connection,
        [...models.filter((item) => item.id !== model.id), model],
        true,
      );
      setStatus("已保存此模型的参数声明；生成结果仍以服务返回为准。");
    } catch {
      setStatus("目录保存失败，请检查本地存储。");
    }
  }
  return (
    <fieldset className="provider-model-catalog">
      <legend>模型与参数</legend>
      <button type="button" disabled={loading} onClick={onRefresh}>
        {loading ? "刷新中…" : "刷新模型列表"}
      </button>
      <label>
        已发现的模型
        <select
          aria-label="已发现的模型"
          value={profile.model}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">选择模型</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        当前模型用途
        <select
          aria-label="当前模型用途"
          value={kind}
          onChange={(event) => setKind(event.target.value as ModelKind)}
        >
          <option value="unknown">未声明</option>
          <option value="text">文本对话</option>
          <option value="image">图片</option>
          <option value="video">视频（执行器待接入）</option>
          <option value="audio">音频（执行器待接入）</option>
        </select>
      </label>
      {kind === "image" && (
        <label>
          支持的图片尺寸
          <input
            aria-label="支持的图片尺寸"
            value={sizes}
            placeholder="例如 1024x1024, 1536x1024；留空使用默认尺寸"
            onChange={(event) => setSizes(event.target.value)}
          />
        </label>
      )}
      <p>
        按供应商文档填写。模型列表通常不包含尺寸信息；未声明时只使用默认尺寸，不推测
        2K 或 4K 能力。
      </p>
      <details>
        <summary>型号显示与搜索别名</summary>
        <label>
          模型分组名称
          <input
            aria-label="模型分组名称"
            maxLength={120}
            value={family}
            onChange={(event) => setFamily(event.target.value)}
            placeholder="留空自动识别末尾 2K / 4K / High / Low"
          />
        </label>
        <label>
          型号参数名称
          <input
            aria-label="型号参数名称"
            maxLength={120}
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
            placeholder="例如 4K · High · 官方渠道"
          />
        </label>
        <label>
          搜索别名
          <input
            aria-label="搜索别名"
            value={aliases}
            maxLength={1000}
            onChange={(event) => setAliases(event.target.value)}
            placeholder="多个别名用逗号分隔"
          />
        </label>
        <p>
          仅影响分组和检索。生成仍发送选定型号的完整
          ID，不根据后缀拼造参数或不存在的型号。
        </p>
      </details>
      <button type="button" disabled={!profile.model || loading} onClick={save}>
        保存此模型能力
      </button>
      {status && <p role="status">{status}</p>}
    </fieldset>
  );
}
