import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SettingsInfoHint, {
  isLongSettingsDescription,
} from "../../src/components/settings/SettingsInfoHint.tsx";
import SettingsTitleRow from "../../src/components/settings/SettingsTitleRow.tsx";

test("settings info hint exposes a labelled button and stable tooltip description", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      SettingsInfoHint,
      { id: "providers-description", label: "查看模型接入说明" },
      "长说明内容",
    ),
  );

  assert.match(html, /aria-label="查看模型接入说明"/u);
  assert.match(html, /aria-describedby="settings-info-providers-description"/u);
  assert.match(html, /id="settings-info-providers-description"/u);
  assert.match(html, /role="tooltip"/u);
  assert.match(html, /长说明内容/u);
});

test("settings description helper keeps short copy inline and flags long copy", () => {
  assert.equal(isLongSettingsDescription("短说明"), false);
  assert.equal(isLongSettingsDescription("x".repeat(40)), false);
  assert.equal(isLongSettingsDescription("x".repeat(41)), true);
});

test("settings title row keeps the info hint beside its heading", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      SettingsTitleRow,
      { id: "title-row", label: "查看标题说明", description: "标题说明" },
      React.createElement("h3", null, "标题"),
    ),
  );
  assert.match(html, /class="settings-title-row"/u);
  assert.match(html, /标题/u);
  assert.match(html, /查看标题说明/u);
});
