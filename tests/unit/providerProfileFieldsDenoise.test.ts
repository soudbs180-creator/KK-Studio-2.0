import assert from "node:assert/strict";
import test from "node:test";
import { shouldExpandCustomRelay } from "../../src/components/settings/ProviderProfileFields.tsx";

test("官方预设默认不展开自定义中转折叠", () => {
  assert.equal(
    shouldExpandCustomRelay(
      { category: "官方", baseUrl: "https://api.deepseek.com" },
      "official",
    ),
    false,
  );
});

test("空 Base URL 的网关预设默认展开自定义中转", () => {
  assert.equal(
    shouldExpandCustomRelay({ category: "网关", baseUrl: "" }, "relay"),
    true,
  );
  assert.equal(
    shouldExpandCustomRelay({ category: "网关", baseUrl: "   " }, "official"),
    true,
  );
});

test("已有地址的网关仅在中转 scope 默认展开", () => {
  assert.equal(
    shouldExpandCustomRelay(
      { category: "网关", baseUrl: "https://relay.example/v1" },
      "relay",
    ),
    true,
  );
  assert.equal(
    shouldExpandCustomRelay(
      { category: "网关", baseUrl: "https://relay.example/v1" },
      "official",
    ),
    false,
  );
});

test("本地预设默认不展开（地址已由预设填入）", () => {
  assert.equal(
    shouldExpandCustomRelay(
      { category: "本地", baseUrl: "http://127.0.0.1:11434/v1" },
      "local",
    ),
    false,
  );
});
