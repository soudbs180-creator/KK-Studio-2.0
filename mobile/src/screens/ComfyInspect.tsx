import { useState } from "react";
import type { MobileConnectionMetadata } from "../core/mobileModel.ts";
import type { ComfyHealth, ComfyNodeCatalog } from "../services/comfyTypes.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Card, Label } from "../ui/primitives.tsx";
import { LocalOptionPicker } from "../ui/LocalOptionPicker.tsx";
import { useComfy } from "../ui/useComfy.ts";
import { useScopedRequest } from "../ui/useScopedRequest.ts";
export function ComfyInspect({
  connection,
}: {
  connection: MobileConnectionMetadata;
}) {
  const { state } = useApplication(),
    scope = state.accountId!,
    flow = useComfy(),
    request = useScopedRequest();
  const [health, setHealth] = useState<ComfyHealth>(),
    [folders, setFolders] = useState<string[]>([]),
    [models, setModels] = useState<string[]>([]),
    [catalog, setCatalog] = useState<ComfyNodeCatalog>({}),
    [folder, setFolder] = useState(""),
    [node, setNode] = useState(""),
    [picker, setPicker] = useState<"folder" | "node" | "models">();
  return (
    <>
      <Card>
        <Label title>连通性</Label>
        <Label muted small>
          {connection.baseUrl}
        </Label>
        {health && (
          <Label>
            上次检查服务可达 · 版本 {health.version ?? "未报告"}
            {"\n"}生成尚未验证 · 取消能力未确认
          </Label>
        )}
        <Action
          primary
          label="检查服务"
          busy={request.busy}
          onPress={() =>
            void request.run(
              (signal) => flow.health(connection.id, scope, signal),
              setHealth,
            )
          }
        />
        <Action
          label="停止本次检查"
          disabled={!request.busy}
          onPress={request.stop}
        />
      </Card>
      <Card>
        <Label title>模型目录</Label>
        <Label muted small>
          列表来自服务设备。此处查看文件名称，不更改普通生成模型，也不下载模型文件。
        </Label>
        <Action
          label="读取模型目录"
          busy={request.busy}
          onPress={() =>
            void request.run(
              (signal) => flow.listModelFolders(connection.id, scope, signal),
              (value) => {
                setFolders(value);
                setPicker("folder");
              },
            )
          }
        />
        {folders.length > 0 && (
          <Action
            label={`选择目录（${folders.length}）`}
            onPress={() => setPicker("folder")}
          />
        )}
        {Boolean(folder) && (
          <>
            <Label>目录：{folder}</Label>
            <Action
              label="读取该目录模型"
              busy={request.busy}
              onPress={() =>
                void request.run(
                  (signal) =>
                    flow.listModels(connection.id, folder, scope, signal),
                  (value) => {
                    setModels(value);
                    setPicker("models");
                  },
                )
              }
            />
          </>
        )}
      </Card>
      <Card>
        <Label title>节点类型</Label>
        <Action
          label="读取节点与输入定义"
          busy={request.busy}
          onPress={() =>
            void request.run(
              (signal) => flow.inspectNodes(connection.id, scope, signal),
              (value) => {
                setCatalog(value);
                setPicker("node");
              },
            )
          }
        />
        {Object.keys(catalog).length > 0 && (
          <Action
            label={`查看节点（${Object.keys(catalog).length}）`}
            onPress={() => setPicker("node")}
          />
        )}
        {catalog[node] && (
          <>
            <Label>{node}</Label>
            <Label small>
              {JSON.stringify(catalog[node], null, 2).slice(0, 12000)}
            </Label>
            <Label muted small>
              定义较大时此处只显示前 12000 字；完整定义仍用于工作流预检。
            </Label>
          </>
        )}
      </Card>
      {picker && (
        <LocalOptionPicker
          title={
            picker === "folder"
              ? "模型目录"
              : picker === "models"
                ? "模型文件（仅查看）"
                : "节点定义"
          }
          options={(picker === "folder"
            ? folders
            : picker === "models"
              ? models
              : Object.keys(catalog)
          ).map((id) => ({ id, label: id }))}
          selected={picker === "folder" ? folder : node}
          onSelect={(id) => {
            if (picker === "folder") setFolder(id);
            if (picker === "node") setNode(id);
            setPicker(undefined);
          }}
          onClose={() => setPicker(undefined)}
        />
      )}
    </>
  );
}
