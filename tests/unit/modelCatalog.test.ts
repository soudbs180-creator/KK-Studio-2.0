import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCatalogModels,
  catalogForConnection,
  imageSizeOptions,
} from "../../src/features/models/modelCatalog.ts";

test("模型目录只接收非敏感元数据，未知模型不虚构能力", () => {
  const models = parseCatalogModels({
    data: [
      { id: "new-model", api_key: "secret" },
      {
        id: "image-v2",
        capabilities: {
          modalities: ["image"],
          sizes: ["1024x1024", "1536x1024", "bad"],
        },
      },
      { id: "image-v2" },
    ],
  });
  assert.equal(models.length, 2);
  assert.equal(models[0].kind, "unknown");
  assert.deepEqual(models[1].sizes, ["1024x1024", "1536x1024"]);
  assert.equal(JSON.stringify(models).includes("secret"), false);
  assert.throws(() => parseCatalogModels({ models: [] }));
});
test("同名模型保留账号身份，换地址或凭据后旧目录失效", () => {
  const connection = {
    id: "a",
    baseUrl: "https://api.example/v1",
    credentialRef: "key-a",
    model: "old",
  };
  const catalog = {
    ...connection,
    fetchedAt: 1,
    models: [{ id: "new", kind: "image" as const }],
  };
  assert.equal(
    catalogForConnection(connection, [catalog]).some(
      (model) => model.id === "new",
    ),
    true,
  );
  assert.equal(
    catalogForConnection({ ...connection, credentialRef: "key-b" }, [
      catalog,
    ])[0].id,
    "old",
  );
});
test("尺寸与比例来自明确规格，不把 16:9 任意换算为供应商尺寸", () => {
  assert.deepEqual(
    imageSizeOptions({
      id: "x",
      kind: "image",
      sizes: ["1536x1024", "1024x1024"],
    }),
    [
      { size: "1536x1024", ratio: "3:2" },
      { size: "1024x1024", ratio: "1:1" },
    ],
  );
  assert.deepEqual(imageSizeOptions({ id: "unknown", kind: "image" }), []);
});
