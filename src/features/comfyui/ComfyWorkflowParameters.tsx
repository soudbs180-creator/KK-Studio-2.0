import { useId, useState } from "react";
import type { WorkflowRecord } from "../../domain/comfyWorkflow.ts";
import {
  workflowParameters,
  updateWorkflowParameter,
} from "./workflowParameters.ts";

export default function ComfyWorkflowParameters({
  record,
  onChange,
  disabled = false,
}: {
  record: WorkflowRecord;
  onChange: (record: WorkflowRecord) => void;
  disabled?: boolean;
}) {
  const prefix = useId();
  const [error, setError] = useState("");
  const parameters = workflowParameters(record.workflow);
  return (
    <fieldset className="comfy-parameters" disabled={disabled}>
      <legend>参数微调</legend>
      {record.needsConversion ? (
        <p>先进入原生工作流并同步，或导入 API JSON。</p>
      ) : (
        parameters.map((parameter) => {
          const id = `${prefix}-${parameter.nodeId}-${parameter.input}`;
          const props = {
            id,
            value: parameter.value,
            title: `${parameter.label} · 节点 ${parameter.nodeId}`,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              try {
                const value =
                  typeof parameter.value === "number"
                    ? event.target.value.trim()
                      ? Number(event.target.value)
                      : NaN
                    : event.target.value;
                onChange({
                  ...record,
                  workflow: updateWorkflowParameter(
                    record.workflow,
                    parameter.nodeId,
                    parameter.input,
                    value,
                  ),
                  updatedAt: Date.now(),
                });
                setError("");
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : String(error),
                );
              }
            },
          };
          return (
            <label key={id} htmlFor={id}>
              <span>
                {parameter.label}
                <small> #{parameter.nodeId}</small>
              </span>
              {parameter.multiline ? (
                <textarea {...props} rows={2} />
              ) : (
                <input
                  {...props}
                  type={typeof parameter.value === "number" ? "number" : "text"}
                  min={parameter.min}
                  max={parameter.max}
                  step={1}
                />
              )}
            </label>
          );
        })
      )}
      {!record.needsConversion && !parameters.length && (
        <p>此工作流没有可直接微调的标量参数，可进入原生编辑器修改。</p>
      )}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
