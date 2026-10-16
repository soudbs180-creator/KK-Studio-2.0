import {
  CANVAS_REFERENCE_SLOTS,
  type CanvasReferenceSlot,
} from "../../domain/canvasItems.ts";
import type { CreationAttachment } from "../creation/model.ts";
import type { AgentDraftAttachment } from "../agent/agentAttachments.ts";

export interface ParsedMention {
  raw: string;
  targetId: string;
  name: string;
  slot: CanvasReferenceSlot;
  startIndex: number;
  endIndex: number;
}

export interface ResolvedReferenceItem {
  refLabel: string; // e.g. "[Ref_1]"
  refIndex: number; // 1-based index
  targetId: string;
  name: string;
  slot: CanvasReferenceSlot;
  attachmentIndex?: number; // 1-based index in the final attachment array
}

export interface CompiledStructuredPrompt {
  /** 编译后用于直接发送给多模态大模型的最终 Prompt（包含角色清单和正文） */
  fullPrompt: string;
  /** 替换了 Token、消除了歧义的纯净用户需求正文 */
  cleanPrompt: string;
  /** 格式化的参考素材角色与约束规范前言（如果没有参考素材则为空） */
  preamble: string;
  /** 解析出的所有结构化素材引用列表 */
  references: ResolvedReferenceItem[];
  /** 与引用代号顺序对齐整理后的附件列表 */
  alignedAttachments: AgentDraftAttachment[];
}

export const CANONICAL_MENTION_REGEX =
  /@\{mention:([^|}]+)\|([^|}]+)\|([^|}]+)\}/gu;

export const LOOSE_MENTION_REGEX =
  /@([^\s@，,；;[\]]+)(?:\[([^\]]+)\])?/gu;

/** Slot 角色详细约束指引，针对多模态与生图模型注入 */
export const SLOT_CONSTRAINTS: Record<CanvasReferenceSlot, { title: string; constraint: string }> = {
  主体: {
    title: "核心主体（外观与身份）",
    constraint:
      "以该素材为画面核心主体，严格锁定其结构轮廓、五官人脸或工业设计特征，严禁随意形变或改变关键造型。",
  },
  风格: {
    title: "艺术风格与光影氛围",
    constraint:
      "仅参考其艺术画风、色调配色、光影反差与空间质感，严禁将该参考图中的主体物品或不相干杂物直接复制到画面。",
  },
  材质: {
    title: "表面材质与纹理细节",
    constraint:
      "参考其特定材质（如木纹、金属拉丝、磨砂皮革、织物或反射质感），将这种材质真实迁移到画面对应物体表面。",
  },
  构图: {
    title: "空间透视与摄影机位",
    constraint:
      "参考其镜头焦段、拍摄视角（平视/微俯仰）、主体构图比例与纵深空间，保持画面的几何透视平衡。",
  },
  Mask: {
    title: "局部蒙版重绘区域",
    constraint:
      "仅在指定的蒙版或色块区域进行编辑与修改，保持蒙版区域外的背景、主体和光影完全不变。",
  },
};

/** 序列化一个内联 Token 标记 */
export function serializeMentionToken(
  targetId: string,
  name: string,
  slot: CanvasReferenceSlot = "主体",
): string {
  const safeName = name.replace(/[|{}]/g, " ").trim() || "参考素材";
  const safeSlot = CANVAS_REFERENCE_SLOTS.includes(slot) ? slot : "主体";
  return `@{mention:${targetId}|${safeName}|${safeSlot}}`;
}

/** 解析文本中包含的 Mention Tokens */
export function extractMentionTokens(text: string): ParsedMention[] {
  if (!text) return [];
  const results: ParsedMention[] = [];
  const seenRanges: Array<[number, number]> = [];

  // 1. 优先匹配规范格式 @{mention:id|name|slot}
  const canonicalMatches = [...text.matchAll(CANONICAL_MENTION_REGEX)];
  for (const match of canonicalMatches) {
    const raw = match[0];
    const startIndex = match.index!;
    const endIndex = startIndex + raw.length;
    const targetId = match[1].trim();
    const name = match[2].trim();
    const candidateSlot = match[3].trim() as CanvasReferenceSlot;
    const slot = CANVAS_REFERENCE_SLOTS.includes(candidateSlot)
      ? candidateSlot
      : "主体";

    results.push({
      raw,
      targetId,
      name,
      slot,
      startIndex,
      endIndex,
    });
    seenRanges.push([startIndex, endIndex]);
  }

  // 2. 匹配松散格式 @素材名[槽位] 或 @素材名（但避开已被规范格式占据的区间）
  const looseMatches = [...text.matchAll(LOOSE_MENTION_REGEX)];
  for (const match of looseMatches) {
    const startIndex = match.index!;
    const endIndex = startIndex + match[0].length;
    const isOverlapping = seenRanges.some(
      ([s, e]) =>
        (startIndex >= s && startIndex < e) || (endIndex > s && endIndex <= e),
    );
    if (isOverlapping) continue;

    const raw = match[0];
    const name = match[1].trim();
    const rawSlot = match[2]?.trim();
    let slot: CanvasReferenceSlot = "主体";
    if (rawSlot && CANVAS_REFERENCE_SLOTS.includes(rawSlot as CanvasReferenceSlot)) {
      slot = rawSlot as CanvasReferenceSlot;
    }

    results.push({
      raw,
      targetId: name, // 松散匹配以名称作为 targetId
      name,
      slot,
      startIndex,
      endIndex,
    });
  }

  return results.sort((a, b) => a.startIndex - b.startIndex);
}

/** 编译结构化提示词与整理附件列表 */
export function compileStructuredPrompt(options: {
  prompt: string;
  attachments?: (CreationAttachment | AgentDraftAttachment)[];
  availableItems?: Array<{ id: string; title: string; assetId?: string; referenceSlot?: CanvasReferenceSlot }>;
}): CompiledStructuredPrompt {
  const { prompt, attachments = [], availableItems = [] } = options;
  const mentions = extractMentionTokens(prompt);

  // 1. 解析唯一的引用实体并分配稳定代号 [Ref_1], [Ref_2]...
  const refMap = new Map<string, ResolvedReferenceItem>();
  const references: ResolvedReferenceItem[] = [];
  let nextRefIndex = 1;

  for (const m of mentions) {
    const key = m.targetId || m.name;
    if (!refMap.has(key)) {
      const item = {
        refLabel: `[Ref_${nextRefIndex}]`,
        refIndex: nextRefIndex,
        targetId: m.targetId,
        name: m.name,
        slot: m.slot,
      };
      refMap.set(key, item);
      references.push(item);
      nextRefIndex++;
    }
  }

  // 2. 替换正文中的 Token 为代号 [Ref_1]
  let cleanPrompt = prompt;
  if (mentions.length > 0) {
    // 从后往前替换，避免偏移问题
    for (let i = mentions.length - 1; i >= 0; i--) {
      const m = mentions[i];
      const key = m.targetId || m.name;
      const ref = refMap.get(key);
      if (ref) {
        cleanPrompt =
          cleanPrompt.slice(0, m.startIndex) +
          ref.refLabel +
          cleanPrompt.slice(m.endIndex);
      }
    }
  }
  cleanPrompt = cleanPrompt.trim();

  // 3. 将附件与引用代号严格对齐
  const alignedAttachments: AgentDraftAttachment[] = [];
  const assignedAttachmentIds = new Set<string>();

  // 优先对齐被显式引用的素材
  for (const ref of references) {
    const matched = attachments.find(
      (att) =>
        !assignedAttachmentIds.has(att.id) &&
        (att.id === ref.targetId ||
          att.name === ref.name ||
          (att.assetId && ref.targetId === att.assetId)),
    );

    if (matched) {
      assignedAttachmentIds.add(matched.id);
      const updatedAttachment: AgentDraftAttachment = {
        ...matched,
        role: ref.slot,
      };
      alignedAttachments.push(updatedAttachment);
      ref.attachmentIndex = alignedAttachments.length;
    } else {
      // 检查 availableItems 是否有对应的节点
      const matchedNode = availableItems.find(
        (node) => node.id === ref.targetId || node.title === ref.name,
      );
      if (matchedNode) {
        // 标记引用的画布卡片
        ref.name = matchedNode.title || ref.name;
      }
    }
  }

  // 剩余未在正文中显式引用的附件，按原有顺序追加
  for (const att of attachments) {
    if (!assignedAttachmentIds.has(att.id)) {
      alignedAttachments.push({ ...att });
      const currentIdx = alignedAttachments.length;
      // 为未引用的附件也登记一个备用 Ref
      const slot = (att.role as CanvasReferenceSlot) || "主体";
      references.push({
        refLabel: `[Ref_${nextRefIndex}]`,
        refIndex: nextRefIndex,
        targetId: att.id,
        name: att.name,
        slot,
        attachmentIndex: currentIdx,
      });
      nextRefIndex++;
    }
  }

  // 4. 构建结构化约束前言（Preamble）
  let preamble = "";
  if (references.length > 0) {
    const preambleLines: string[] = [
      "【参考素材角色分配与约束清单】：",
    ];

    for (const ref of references) {
      const attInfo = ref.attachmentIndex
        ? `（对应附件 ${ref.attachmentIndex}：《${ref.name}》）`
        : `（《${ref.name}》）`;
      const config = SLOT_CONSTRAINTS[ref.slot] || SLOT_CONSTRAINTS["主体"];

      preambleLines.push(`- 素材 ${ref.refLabel}${attInfo}：`);
      preambleLines.push(`  - 角色定位：【${ref.slot} · ${config.title}】`);
      preambleLines.push(`  - 核心约束：${config.constraint}`);
    }

    preamble = preambleLines.join("\n");
  }

  // 5. 组合成发给模型的最终 Prompt
  const fullPrompt = preamble
    ? [preamble, cleanPrompt ? `【用户核心创作指令】：\n${cleanPrompt}` : ""]
        .filter(Boolean)
        .join("\n\n")
    : cleanPrompt;

  return {
    fullPrompt,
    cleanPrompt,
    preamble,
    references,
    alignedAttachments,
  };
}
