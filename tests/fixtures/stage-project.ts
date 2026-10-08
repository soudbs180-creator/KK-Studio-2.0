import { createProject } from "../../src/features/creation/model.ts";
import { createStagePlan } from "../../src/domain/stagePlan.ts";

export function stageProject(empty = false) {
  const project = createProject({
    prompt: "阶段审批验证",
    model: "fixture-model",
    kind: "image",
    attachments: [],
  });
  project.name = "阶段审批项目";
  const stamp = Date.now();
  const plan = createStagePlan({
    id: "plan-workbench",
    title: "产品短片计划",
    projectId: project.id,
    createdBy: "user",
    stages: [
      {
        name: "分镜方案",
        goal: "确认场景与镜头",
        approvalGate: "plan",
        workItems: [
          {
            id: "work-script",
            kind: "text",
            prompt: "编写产品分镜",
            status: "queued",
            dependencies: [],
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      },
      {
        name: "画面结果",
        goal: "审阅已经完成的画面",
        approvalGate: "result",
        workItems: [
          {
            id: "work-image",
            kind: "image",
            prompt: "保留原始产品提示词",
            status: "succeeded",
            dependencies: [],
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      },
      {
        name: "后续镜头",
        goal: "沿用审阅过的产品画面",
        workItems: [
          {
            id: "work-video",
            kind: "video",
            prompt: "产品特写镜头",
            status: "queued",
            dependencies: ["work-image"],
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      },
    ],
  });
  plan.stages[0].status = "plan_review";
  plan.stages[1].status = "result_review";
  project.stagePlans = empty ? [] : [plan];
  return project;
}
