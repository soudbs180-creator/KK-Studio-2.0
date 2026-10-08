import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelNativeTask,
  getNativeTask,
  listNativeTasks,
  reconcileNativeTasks,
  submitNativeTask,
  validateNativeTaskRecord,
  type NativeTaskHostRequest,
} from "../../src/features/creation/nativeTaskHost.ts";
import {
  createProject,
  createTask,
  emptySnapshot,
  normalizeCreationSnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";

test("native text recovery restores bounded content and result edge exactly once", async () => {
  const project = createProject({
    prompt: "介绍",
    model: "gpt-text-test",
    kind: "text",
    attachments: [],
  });
  const task = {
    ...createTask(project),
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
  };
  project.tasks = [task];
  const native = record({
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    status: "succeeded",
    outputs: [{ index: 0, status: "succeeded", text: "文案".repeat(6000) }],
  });
  desktop(async (command) => {
    if (command === "task_host_list") return [native];
    if (command === "task_host_get") return native;
    throw new Error("text recovery must not read image assets or submit again");
  });
  try {
    const snapshot = {
      ...emptySnapshot(),
      projects: [project],
      activeProjectId: project.id,
    };
    const recovered = await reconcileNativeTasks(snapshot);
    // 36KB is rejected even if an IPC response marks it as completed.
    assert.equal(recovered.projects[0].tasks[0].status, "unknown");
    assert.equal(recovered.projects[0].tasks[0].resultItemId, undefined);
    native.outputs = [
      { index: 0, status: "succeeded", text: "文案".repeat(5000) },
    ];
    const valid = await reconcileNativeTasks(snapshot);
    assert.equal(valid.projects[0].tasks[0].status, "succeeded");
    assert.equal(valid.projects[0].items.at(-1)?.result?.text?.length, 10000);
    assert.equal(
      valid.projects[0].canvas.edges.filter((edge) => edge.kind === "result")
        .length,
      1,
    );
    const roundtrip = normalizeCreationSnapshot(valid)!;
    assert.equal(
      roundtrip.projects[0].items.at(-1)?.result?.text,
      "文案".repeat(5000),
    );
    const again = await reconcileNativeTasks(roundtrip);
    assert.equal(
      again.projects[0].items.length,
      valid.projects[0].items.length,
    );
    assert.equal(
      again.projects[0].canvas.edges.filter((edge) => edge.kind === "result")
        .length,
      1,
    );
    const edited = structuredClone(again);
    const editedResult = edited.projects[0].items.at(-1)!;
    editedResult.title = "用户标题";
    editedResult.result!.text = "用户保存的文案";
    const editedRecovered = await reconcileNativeTasks(edited);
    assert.equal(editedRecovered.projects[0].items.at(-1)?.title, "用户标题");
    assert.equal(
      editedRecovered.projects[0].items.at(-1)?.result?.text,
      "用户保存的文案",
    );
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native text success without final text does not promote a draft", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "succeeded",
          outputs: [{ index: 0, status: "succeeded" }],
        }),
      ];
    throw new Error("an incomplete text receipt must not create a result");
  });
  const project = createProject({
    prompt: "介绍",
    model: "gpt-text-test",
    kind: "text",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
      outputs: [
        {
          index: 0,
          status: "running",
          text: "流式草稿",
          model: "gpt-text-test",
          createdAt: 1,
        },
      ],
    },
  ];
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      revision: 1,
      activeProjectId: project.id,
      projects: [project],
    });
    const task = recovered.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.submissionState, "unknown");
    assert.equal(task.outputs?.[0].status, "unknown");
    assert.equal(task.outputs?.[0].text, "流式草稿");
    assert.equal(task.resultItemId, undefined);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

function desktop(
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>,
) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { __TAURI_INTERNALS__: { invoke } },
  });
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    taskId: "task-1",
    idempotencyKey: "stable-1",
    status: "submitted",
    outputIndices: [0],
    outputs: [{ index: 0, status: "pending" }],
    updatedAt: 42,
    ...overrides,
  };
}

for (const identity of [
  { taskId: "task-1", idempotencyKey: "foreign-key" },
  { taskId: "foreign-task", idempotencyKey: "stable-1" },
]) {
  for (const archived of [false, true]) {
    test(`native recovery rejects a mismatched identity ${JSON.stringify(identity)} with archived=${archived}`, async () => {
      const project = createProject({
        prompt: "生成",
        model: "test-model",
        kind: archived ? "image" : "text",
        attachments: [],
      });
      project.tasks = [
        {
          ...createTask(project),
          id: "task-1",
          idempotencyKey: "stable-1",
          sourceItemId: project.items[0].id,
          status: "running",
          submissionState: "submitted",
          outputs: [
            {
              index: 0,
              status: archived ? "succeeded" : "running",
              assetId: archived ? "asset-original" : undefined,
              model: project.model,
              createdAt: 1,
            },
          ],
          completedOutputs: archived ? 1 : 0,
        },
      ];
      let assetReads = 0;
      desktop(async (command) => {
        if (command === "task_host_list")
          return [
            record({
              ...identity,
              status: "succeeded",
              outputs: [
                {
                  index: 0,
                  status: "succeeded",
                  text: "foreign text",
                  assetId: "asset-foreign",
                },
              ],
            }),
          ];
        if (command === "asset_read") assetReads++;
        throw new Error(
          "foreign receipt must not load assets or create results",
        );
      });
      try {
        const recovered = await reconcileNativeTasks({
          ...emptySnapshot(),
          activeProjectId: project.id,
          projects: [project],
        });
        const result = recovered.projects[0].tasks[0];
        assert.equal(result.status, "unknown");
        assert.equal(result.submissionState, "unknown");
        assert.equal(
          result.outputs?.[0].status,
          archived ? "succeeded" : "unknown",
        );
        assert.equal(
          result.outputs?.[0].assetId,
          archived ? "asset-original" : undefined,
        );
        assert.equal(result.outputs?.[0].text, undefined);
        assert.equal(result.completedOutputs, archived ? 1 : 0);
        assert.equal(recovered.projects[0].items.length, project.items.length);
        assert.equal(assetReads, 0);
      } finally {
        Reflect.deleteProperty(globalThis, "window");
      }
    });
  }
}

const invalidOutputReceipts = [
  {
    name: "conflicting duplicate outputs",
    outputs: [
      { index: 0, status: "failed" },
      { index: 0, status: "unknown" },
    ],
  },
  {
    name: "duplicate successes",
    outputs: [
      { index: 0, status: "succeeded", text: "foreign text" },
      { index: 0, status: "succeeded", text: "other text" },
    ],
  },
  { name: "duplicate declared indices", outputIndices: [0, 0] },
  { name: "undeclared output", outputIndices: [] },
  {
    name: "unexpected output",
    outputs: [
      { index: 0, status: "failed" },
      { index: 1, status: "failed" },
    ],
  },
  {
    name: "unexpected declared index",
    outputIndices: [0, 1],
    outputs: [
      { index: 0, status: "failed" },
      { index: 1, status: "failed" },
    ],
  },
  { name: "missing declared receipt", outputs: [] },
  { name: "malformed extra index", outputIndices: [0, "invalid"] },
];
for (const { name, ...overrides } of invalidOutputReceipts) {
  test(`native recovery fences ${name} and preserves archived evidence`, async () => {
    const project = createProject({
      prompt: "介绍",
      model: "text-test",
      kind: "text",
      attachments: [],
    });
    project.tasks = [
      {
        ...createTask(project),
        id: "task-1",
        idempotencyKey: "stable-1",
        sourceItemId: project.items[0].id,
        status: "running",
        submissionState: "submitted",
        outputs: [
          {
            index: 0,
            status: "succeeded",
            text: "已归档文案",
            model: project.model,
            createdAt: 1,
          },
        ],
        completedOutputs: 1,
      },
    ];
    desktop(async (command) => {
      if (command === "task_host_list")
        return [record({ status: "failed", ...overrides })];
      throw new Error(
        "invalid receipts must not import results or submit again",
      );
    });
    try {
      const recovered = await reconcileNativeTasks({
        ...emptySnapshot(),
        activeProjectId: project.id,
        projects: [project],
      });
      const result = recovered.projects[0].tasks[0];
      assert.equal(result.status, "unknown");
      assert.equal(result.submissionState, "unknown");
      assert.equal(result.outputs?.length, 1);
      assert.equal(result.outputs?.[0].status, "succeeded");
      assert.equal(result.outputs?.[0].text, "已归档文案");
      assert.equal(result.completedOutputs, 1);
      assert.equal(recovered.projects[0].items.length, project.items.length);
    } finally {
      Reflect.deleteProperty(globalThis, "window");
    }
  });
}

test("native recovery accepts a consistent subset and preserves other archived slots", async () => {
  const project = createProject({
    prompt: "介绍",
    model: "text-test",
    kind: "text",
    attachments: [],
  });
  const task = {
    ...createTask(project),
    id: "task-1",
    idempotencyKey: "stable-1",
    requestedOutputs: 2,
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
    outputs: [
      {
        index: 0,
        status: "succeeded" as const,
        text: "已归档文案",
        model: project.model,
        createdAt: 1,
      },
    ],
    completedOutputs: 1,
  };
  project.tasks = [task];
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          status: "succeeded",
          outputIndices: [1],
          outputs: [{ index: 1, status: "succeeded", text: "新文案" }],
        }),
      ];
    throw new Error("text recovery must not read assets or submit again");
  });
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      activeProjectId: project.id,
      projects: [project],
    });
    const result = recovered.projects[0].tasks[0];
    assert.equal(result.status, "succeeded");
    assert.equal(result.completedOutputs, 2);
    assert.deepEqual(
      result.outputs?.map((output) => output.text),
      ["已归档文案", "新文案"],
    );
    const native = (await listNativeTasks())[0];
    assert.equal(validateNativeTaskRecord(native, task, [1]), native);
    assert.equal(validateNativeTaskRecord(native, task, [0]).status, "unknown");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("legacy assetIds receipts retain their declared output identity", async () => {
  desktop(async () => [
    record({
      status: "succeeded",
      outputs: undefined,
      outputIndices: [1],
      assetIds: ["asset-original"],
    }),
  ]);
  try {
    const native = (await listNativeTasks())[0];
    assert.deepEqual(native.outputs, [
      {
        index: 1,
        status: "succeeded",
        assetId: "asset-original",
        text: undefined,
        error: undefined,
      },
    ]);
    assert.equal(
      validateNativeTaskRecord(
        native,
        { id: "task-1", idempotencyKey: "stable-1", requestedOutputs: 2 },
        [1],
      ),
      native,
    );
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

for (const malformedOutputs of ["corrupt-output-vector", { index: 0 }, null]) {
  test(`explicit ${JSON.stringify(malformedOutputs)} outputs cannot fall back to legacy assetIds`, async () => {
    const project = createProject({
      prompt: "生成",
      model: "image-test",
      kind: "image",
      attachments: [],
    });
    project.tasks = [
      {
        ...createTask(project),
        id: "task-1",
        idempotencyKey: "stable-1",
        status: "running",
        submissionState: "submitted",
      },
    ];
    let assetReads = 0;
    desktop(async (command) => {
      if (command === "task_host_list")
        return [
          record({
            status: "succeeded",
            outputs: malformedOutputs,
            assetIds: ["asset-foreign"],
          }),
        ];
      if (command === "asset_read") {
        assetReads++;
        return {
          metadata: { assetId: "asset-foreign", mime: "image/png" },
          dataBase64: "AA==",
        };
      }
      throw new Error("malformed receipts must not submit again");
    });
    try {
      const recovered = await reconcileNativeTasks({
        ...emptySnapshot(),
        activeProjectId: project.id,
        projects: [project],
      });
      const result = recovered.projects[0].tasks[0];
      assert.equal(result.status, "unknown");
      assert.equal(result.submissionState, "unknown");
      assert.equal(result.outputs?.[0].status, "unknown");
      assert.equal(result.outputs?.[0].assetId, undefined);
      assert.equal(result.resultItemId, undefined);
      assert.equal(recovered.projects[0].items.length, project.items.length);
      assert.equal(assetReads, 0);
    } finally {
      Reflect.deleteProperty(globalThis, "window");
    }
  });
}

test("native TaskHost adapter forwards stable request and command arguments", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  desktop(async (command, args) => {
    calls.push({ command, args });
    if (command === "task_host_list") return [record()];
    return record();
  });
  try {
    const request: NativeTaskHostRequest = {
      taskId: "task-1",
      idempotencyKey: "stable-1",
      baseUrl: "https://provider.test/v1",
      credentialRef: "credential-1",
      model: "image-test",
      prompt: "生成一张图",
      outputIndices: [0],
      attachments: [{ assetId: "asset-a", name: "ref.png" }],
      providerName: "Local",
      promptHash: "hash-1",
    };
    for (const value of [
      await submitNativeTask(request),
      await getNativeTask("task-1"),
      (await listNativeTasks())[0],
      await cancelNativeTask("task-1"),
    ]) {
      assert.equal(value?.taskId, "task-1");
      assert.equal(value?.idempotencyKey, "stable-1");
      assert.equal(value?.status, "submitted");
    }
    assert.deepEqual(calls, [
      { command: "task_host_submit", args: { request } },
      { command: "task_host_get", args: { taskId: "task-1" } },
      { command: "task_host_list", args: {} },
      { command: "task_host_cancel", args: { taskId: "task-1" } },
    ]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native reconciliation fences a missing submitted task as unknown", async () => {
  desktop(async (command) => {
    assert.ok(command === "task_host_list" || command === "task_host_read");
    return command === "task_host_list" ? [] : [];
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      id: "task-1",
      prompt: project.prompt,
      model: project.model,
      kind: project.kind,
      status: "running",
      submissionState: "submitted",
      createdAt: 1,
      updatedAt: 1,
      attachments: [],
      attempt: 1,
      requestedOutputs: 1,
      completedOutputs: 0,
      idempotencyKey: "stable-1",
      privacyMode: "byok_local",
    },
  ];
  const snapshot: CreationSnapshot = {
    version: 2,
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
    homeDraft: {
      prompt: "",
      model: "",
      kind: "image",
      attachments: [],
      approvalMode: "auto",
      privacyMode: "byok_local",
      outputCount: 1,
      updatedAt: 0,
    },
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const task = reconciled.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.submissionState, "unknown");
    assert.match(task.error ?? "", /不会自动重复提交/);
    assert.equal(reconciled.projects[0].items[0].generationStatus, "error");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native unknown receipt marks pending outputs unknown", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "unknown",
          failure: "provider receipt unavailable",
        }),
      ];
    throw new Error("unknown receipts must not read assets");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
    },
  ];
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      revision: 1,
      activeProjectId: project.id,
      projects: [project],
    });
    const task = recovered.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.outputs?.[0].status, "unknown");
    assert.match(task.error ?? "", /provider receipt unavailable/);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native unknown output keeps previously archived evidence", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "unknown",
          outputs: [
            {
              index: 0,
              status: "unknown",
              error: "provider receipt unavailable",
            },
          ],
        }),
      ];
    throw new Error("archived evidence must not be read again");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "unknown",
      submissionState: "unknown",
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-old",
          model: "image-test",
          createdAt: 1,
        },
      ],
      completedOutputs: 1,
    },
  ];
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      revision: 1,
      activeProjectId: project.id,
      projects: [project],
    });
    const task = recovered.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.outputs?.[0].status, "succeeded");
    assert.equal(task.completedOutputs, 1);
    assert.equal(task.outputs?.[0].assetId, "asset-old");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native image success without an asset identity is treated as unknown", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "succeeded",
          outputs: [{ index: 0, status: "succeeded" }],
        }),
      ];
    throw new Error("a missing asset identity must not read an asset");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
    },
  ];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const task = reconciled.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.submissionState, "unknown");
    assert.equal(task.outputs?.[0].status, "unknown");
    assert.match(task.error ?? "", /素材标识/);
    assert.equal(reconciled.projects[0].items[0].generationStatus, "error");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native recovery preserves an archived image when a terminal receipt omits its asset", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "succeeded",
          outputs: [{ index: 0, status: "succeeded" }],
        }),
      ];
    if (command === "asset_read")
      return {
        metadata: {
          assetId: "asset-old",
          sha256: "hash",
          mime: "image/png",
          tags: [],
          provenance: { generatedAt: "2026-10-03T00:00:00.000Z" },
        },
        dataBase64: "aW1hZ2U=",
      };
    throw new Error(`unexpected native command: ${command}`);
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-old",
          model: "image-test",
          createdAt: 1,
        },
      ],
      completedOutputs: 1,
    },
  ];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const recovered = await reconcileNativeTasks(snapshot);
    const task = recovered.projects[0].tasks[0];
    assert.equal(task.status, "succeeded");
    assert.equal(task.completedOutputs, 1);
    assert.equal(task.outputs?.[0].assetId, "asset-old");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native image success without per-output receipts is treated as unknown", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "succeeded",
          outputs: [],
        }),
      ];
    throw new Error("an absent output receipt must not read an asset");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  const task = {
    ...createTask(project),
    id: "task-1",
    idempotencyKey: "stable-1",
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
  };
  project.tasks = [task];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const recovered = reconciled.projects[0].tasks[0];
    assert.equal(recovered.status, "unknown");
    assert.equal(recovered.submissionState, "unknown");
    assert.equal(recovered.outputs?.[0].status, "unknown");
    assert.match(recovered.error ?? "", /输出/);
    assert.equal(reconciled.projects[0].items[0].generationStatus, "error");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native image recovery reconnects the result edge to its source", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "succeeded",
          outputs: [{ index: 0, status: "succeeded", assetId: "asset-result" }],
        }),
      ];
    if (command === "asset_read")
      return {
        metadata: {
          assetId: "asset-result",
          sha256: "hash",
          mime: "image/png",
          tags: [],
          provenance: { generatedAt: "2026-10-03T00:00:00.000Z" },
        },
        dataBase64: "aW1hZ2U=",
      };
    throw new Error(`unexpected native command: ${command}`);
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  const task = {
    ...createTask(project),
    id: "task-1",
    idempotencyKey: "stable-1",
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
  };
  project.tasks = [task];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const resultId = `${project.id}-task-1-result-1`;
    assert.ok(
      reconciled.projects[0].items.some((item) => item.id === resultId),
    );
    assert.ok(
      reconciled.projects[0].canvas.edges.some(
        (edge) =>
          edge.source === project.items[0].id &&
          edge.target === resultId &&
          edge.kind === "result",
      ),
    );
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native terminal output failures do not become a succeeded task", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "succeeded",
          outputs: [{ index: 0, status: "failed", error: "provider failed" }],
        }),
      ];
    throw new Error("a failed output must not read an asset");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
    },
  ];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const task = reconciled.projects[0].tasks[0];
    assert.equal(task.status, "failed");
    assert.equal(task.submissionState, "terminal");
    assert.equal(task.outputs?.[0].status, "failed");
    assert.equal(reconciled.projects[0].items[0].generationStatus, "error");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native failure preserves already archived output evidence", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "failed",
          failure: "provider failed",
          outputIndices: [0, 1],
          outputs: [
            { index: 0, status: "failed" },
            { index: 1, status: "pending" },
          ],
        }),
      ];
    throw new Error("archived output evidence must not read a missing asset");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  const now = Date.now();
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
      requestedOutputs: 2,
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-old",
          model: "image-test",
          createdAt: now,
        },
        {
          index: 1,
          status: "waiting",
          model: "image-test",
          createdAt: now,
        },
      ],
    },
  ];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const task = reconciled.projects[0].tasks[0];
    assert.equal(task.outputs?.[0].status, "succeeded");
    assert.equal(task.outputs?.[1].status, "failed");
    assert.equal(task.status, "partial");
    assert.equal(task.completedOutputs, 1);
    assert.equal(reconciled.projects[0].items[0].generationStatus, undefined);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native failure with complete archived evidence resolves as succeeded", async () => {
  desktop(async (command) => {
    if (command === "task_host_list")
      return [
        record({
          taskId: "task-1",
          idempotencyKey: "stable-1",
          status: "failed",
          failure: "provider summary failed after the output was archived",
          outputs: [{ index: 0, status: "failed" }],
        }),
      ];
    throw new Error("complete archived evidence must not read a missing asset");
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      id: "task-1",
      idempotencyKey: "stable-1",
      sourceItemId: project.items[0].id,
      status: "running",
      submissionState: "submitted",
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-old",
          model: "image-test",
          createdAt: Date.now(),
        },
      ],
      completedOutputs: 1,
    },
  ];
  const snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const task = reconciled.projects[0].tasks[0];
    assert.equal(task.status, "succeeded");
    assert.equal(task.submissionState, "terminal");
    assert.equal(task.completedOutputs, 1);
    assert.equal(task.outputs?.[0].status, "succeeded");
    assert.equal(task.error, undefined);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
