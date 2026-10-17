export interface SlashCommandContext {
  prompt: string;
  setPrompt: (text: string) => void;
  openModal?: (modalId: string) => void;
  openDrawer?: (drawerId: string) => void;
  setStatus?: (status: string) => void;
  projectId?: string;
}

export interface SlashCommand {
  id: string;
  slash: string; // e.g. "/image"
  name: string; // e.g. "图片生成设置"
  aliases: string[]; // e.g. ["/i", "/img", "生图"]
  description: string;
  icon?: string;
  category?: "generation" | "editing" | "model" | "preset" | "utility";
  execute: (ctx: SlashCommandContext, args?: string) => void | Promise<void>;
}

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();

  constructor(initial: SlashCommand[] = []) {
    for (const cmd of initial) {
      this.register(cmd);
    }
  }

  register(command: SlashCommand): void {
    this.commands.set(command.id, command);
  }

  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  get(id: string): SlashCommand | undefined {
    return this.commands.get(id);
  }

  list(): SlashCommand[] {
    return [...this.commands.values()];
  }

  /**
   * 前缀与模糊搜索匹配命令。
   * 支持输入前几个字母即可补齐（如 /i、/mod、/e 等）。
   */
  match(query: string): SlashCommand[] {
    const raw = query.trim().toLowerCase();
    // 允许带斜杠或不带斜杠检索（例如 "/im" 或 "im"）
    const clean = raw.startsWith("/") ? raw.slice(1) : raw;

    if (!clean) {
      return this.list();
    }

    const matched: Array<{ cmd: SlashCommand; score: number }> = [];

    for (const cmd of this.commands.values()) {
      const slashWithoutPrefix = cmd.slash.slice(1).toLowerCase();
      let score = -1;

      if (slashWithoutPrefix === clean) {
        score = 100; // 精确匹配
      } else if (slashWithoutPrefix.startsWith(clean)) {
        score = 80 - (slashWithoutPrefix.length - clean.length); // 前缀匹配
      } else {
        // 别名匹配
        for (const alias of cmd.aliases) {
          const aliasClean = alias.startsWith("/")
            ? alias.slice(1).toLowerCase()
            : alias.toLowerCase();
          if (aliasClean === clean) {
            score = Math.max(score, 90);
          } else if (aliasClean.startsWith(clean)) {
            score = Math.max(score, 70);
          } else if (aliasClean.includes(clean)) {
            score = Math.max(score, 50);
          }
        }

        // 描述或名称包含
        if (score < 0) {
          if (cmd.name.toLowerCase().includes(clean)) {
            score = 40;
          } else if (cmd.description.toLowerCase().includes(clean)) {
            score = 20;
          }
        }
      }

      if (score > 0) {
        matched.push({ cmd, score });
      }
    }

    return matched.sort((a, b) => b.score - a.score).map((item) => item.cmd);
  }
}

export const BUILTIN_SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "cmd-image",
    slash: "/image",
    aliases: ["/i", "/img", "生图", "画图"],
    name: "图片生成配置",
    description: "配置生图数量、尺寸比例与参数，或切换文生图/图生图",
    icon: "image",
    category: "generation",
    execute: (ctx) => {
      ctx.openModal?.("composer/image-settings");
      ctx.setStatus?.("已打开生图参数面板。");
    },
  },
  {
    id: "cmd-edit",
    slash: "/edit",
    aliases: ["/e", "/ed", "重绘", "涂抹", "编辑"],
    name: "局部重绘与涂抹",
    description: "激活当前选中卡片或首张参考图的色块涂抹编辑模式",
    icon: "brush",
    category: "editing",
    execute: (ctx) => {
      ctx.openModal?.("canvas/image-editor");
      ctx.setStatus?.("已激活局部涂抹重绘。");
    },
  },
  {
    id: "cmd-model",
    slash: "/model",
    aliases: ["/m", "/mod", "模型", "切换模型"],
    name: "切换底层模型",
    description:
      "快速切换当前项目使用的 AI 生图或推理模型（Codex/FLUX/Gemini）",
    icon: "cpu",
    category: "model",
    execute: (ctx) => {
      ctx.openModal?.("settings/providers");
      ctx.setStatus?.("已打开模型选择面板。");
    },
  },
  {
    id: "cmd-skill",
    slash: "/skill",
    aliases: ["/s", "/sk", "技能", "提示词"],
    name: "应用提示词技能",
    description: "一键引入电商白底、商用场景、胶片质感等优质预设 Prompt",
    icon: "magicpen",
    category: "preset",
    execute: (ctx) => {
      ctx.openModal?.("skills");
      ctx.setStatus?.("已打开技能库。");
    },
  },
  {
    id: "cmd-clear",
    slash: "/clear",
    aliases: ["/c", "/cl", "清空", "重置"],
    name: "清空输入草稿",
    description: "快速清空当前输入框文字与已附加的临时素材",
    icon: "trash",
    category: "utility",
    execute: (ctx) => {
      ctx.setPrompt("");
      ctx.setStatus?.("草稿已清空。");
    },
  },
];

export const defaultSlashRegistry = new SlashCommandRegistry(
  BUILTIN_SLASH_COMMANDS,
);
