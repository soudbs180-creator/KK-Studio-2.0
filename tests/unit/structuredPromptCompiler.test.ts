import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  serializeMentionToken,
  extractMentionTokens,
  compileStructuredPrompt,
} from "../../src/features/prompts/structuredPromptCompiler.ts";
import type { CreationAttachment } from "../../src/features/creation/model.ts";

describe("structuredPromptCompiler", () => {
  it("正确序列化 Mention Token", () => {
    const token = serializeMentionToken("node-1", "实木茶几", "主体");
    assert.equal(token, "@{mention:node-1|实木茶几|主体}");

    // 非法槽位 fallback 到主体
    const tokenFallback = serializeMentionToken(
      "node-2",
      "测试|图片",
      // @ts-expect-error test invalid slot
      "未知角色",
    );
    assert.equal(tokenFallback, "@{mention:node-2|测试 图片|主体}");
  });

  it("正确提取规范格式与松散格式的 Mention Token", () => {
    const text =
      "请将 @{mention:img-1|北欧沙发|主体} 放在 @{mention:img-2|低饱和客厅|风格} 中，并参考 @墙面木纹[材质] 的细节。";
    const tokens = extractMentionTokens(text);

    assert.equal(tokens.length, 3);
    assert.equal(tokens[0].targetId, "img-1");
    assert.equal(tokens[0].name, "北欧沙发");
    assert.equal(tokens[0].slot, "主体");

    assert.equal(tokens[1].targetId, "img-2");
    assert.equal(tokens[1].name, "低饱和客厅");
    assert.equal(tokens[1].slot, "风格");

    assert.equal(tokens[2].name, "墙面木纹");
    assert.equal(tokens[2].slot, "材质");
  });

  it("正确编译包含 Token 的提示词、对齐附件并生成结构化角色清单", () => {
    const rawPrompt =
      "生成一张商用海报：让 @{mention:att-1|原木茶几|主体} 完美融入 @{mention:att-2|日光客厅|构图} 的光影中。";

    const attachments: CreationAttachment[] = [
      {
        id: "att-2",
        name: "日光客厅",
        mime: "image/png",
        size: 1024,
        dataUrl: "data:image/png;base64,AAA",
      },
      {
        id: "att-1",
        name: "原木茶几",
        mime: "image/jpeg",
        size: 2048,
        dataUrl: "data:image/jpeg;base64,BBB",
      },
      {
        id: "att-3",
        name: "额外素材",
        mime: "image/png",
        size: 512,
        dataUrl: "data:image/png;base64,CCC",
      },
    ];

    const result = compileStructuredPrompt({
      prompt: rawPrompt,
      attachments,
    });

    // 1. 验证正文中的代号替换（彻底告别图一图二）
    assert.equal(
      result.cleanPrompt,
      "生成一张商用海报：让 [Ref_1] 完美融入 [Ref_2] 的光影中。",
    );

    // 2. 验证前言中包含 [Ref_1] 和 [Ref_2] 的角色与约束
    assert.ok(result.preamble.includes("【参考素材角色分配与约束清单】："));
    assert.ok(result.preamble.includes("素材 [Ref_1]（对应附件 1：《原木茶几》）"));
    assert.ok(result.preamble.includes("角色定位：【主体 · 核心主体（外观与身份）】"));
    assert.ok(result.preamble.includes("素材 [Ref_2]（对应附件 2：《日光客厅》）"));
    assert.ok(result.preamble.includes("角色定位：【构图 · 空间透视与摄影机位】"));

    // 3. 验证附件已按 Ref 顺序重新对齐排布，且分配了 role
    assert.equal(result.alignedAttachments.length, 3);
    assert.equal(result.alignedAttachments[0].id, "att-1");
    assert.equal(result.alignedAttachments[0].role, "主体");
    assert.equal(result.alignedAttachments[1].id, "att-2");
    assert.equal(result.alignedAttachments[1].role, "构图");
    assert.equal(result.alignedAttachments[2].id, "att-3");

    // 4. 验证最终交付 fullPrompt 完整可用
    assert.ok(result.fullPrompt.includes(result.preamble));
    assert.ok(result.fullPrompt.includes(result.cleanPrompt));
  });

  it("当无 Token 引用且无附件时，平稳退化返回纯文本", () => {
    const rawPrompt = "生成一张雪山日出的唯美摄影大片。";
    const result = compileStructuredPrompt({ prompt: rawPrompt });

    assert.equal(result.cleanPrompt, rawPrompt);
    assert.equal(result.preamble, "");
    assert.equal(result.fullPrompt, rawPrompt);
    assert.equal(result.references.length, 0);
    assert.equal(result.alignedAttachments.length, 0);
  });
});
