# 共享记忆契约（MEMORY-CONTRACT）

> 适用于所有运行在用户本机的 AI 产品 / Agent：**Codex（KK Studio 桌面/Web）**、
> **豆包（Doubao Work Agent）**、**WorkBuddy** 等。遵循本契约的产品共享同一份
> 用户记忆，且记忆永远只存在于用户本机。

## 1. 文件位置（唯一权威）

- 共享记忆文件：`~/.kk-memory/memory.json`
  - Windows：`%USERPROFILE%\.kk-memory\memory.json`
  - 目录与文件不存在时由任一产品创建（首次写入前 `create_dir_all`）。
- 各产品**不得**再使用自己数据目录内的记忆文件作为主存储；隔离版旧文件
  （`<app-data>/memory/memory.json`）仅作为一次性种子迁移源，迁移后不再读写。

## 2. 文件格式（version 1）

```jsonc
{
  "version": 1,
  "namespace": "", // 隔离版遗留字段，共享模式恒为空
  "records": [
    {
      "id": "uuid",
      "content": "用户偏好日系插画风格", // ≤200 字
      "memoryType": "user_preference", // user_profile | user_preference | user_habit | user_constraint
      "confidence": 0.8, // 0~1
      "fingerprint": "sha256(归一化content)", // 去重键
      "source": "auto_rule", // auto_rule | manual_codex | manual_user
      "sourceThreadId": "可选",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "lastUsedAt": "可选",
      "active": true,
    },
  ],
}
```

- 解析失败或 `version !== 1`：**拒绝读取并保留原文件**，不覆盖、不静默清空。
- 写入：临时文件 + 原子 rename；单文件 records 上限 10000。

## 3. Agent 读取规则（对话前参考）

- 开关未开启（产品内设置）时，任何 Agent 不得读取本文件。
- 开启时，在对话开始前读取本文件，按与当前输入的相关性（词法重叠/关键词）
  选取**最多 3 条、总长 ≤400 字**作为参考；低置信度（<0.55）或不相关内容跳过。
- 参考内容仅作为背景信息，**用户本轮明确表达的要求始终优先于记忆**；
  记忆与输入冲突时以输入为准。

## 4. Agent 写入规则

- 仅在用户表达**稳定偏好/习惯/约束**时追加记录（如"以后请用…""不要…"
  "我习惯…"）；寒暄、一次性指令不记录。
- 写入前去重：`fingerprint = sha256(normalize(content))` 已存在则跳过（或更新时间戳）。
- 绝不编造用户偏好；不确定时不写。
- 单条 content ≤200 字；记录达到 10000 条后拒绝新增（不删除旧记录）。

## 5. 隐私硬约束（与密钥/账号同级）

- 记忆内容**绝不**上传云端、进入 WebDAV 同步、localStorage、日志、导出包或
  项目包；仅存在于 `~/.kk-memory/memory.json`（Web 浏览器端经用户授权后读写该文件）。
- Agent 不得把记忆内容发送给任何模型服务用于"学习"；手动"让 Codex 提炼"
  仅在用户主动点击时发生（消耗用户 Codex 账号额度）。
- 共享文件目录权限遵循用户本机默认；各产品不应把该文件暴露给非授权进程。

## 6. 清空与重置

- 用户可在任一产品设置页"清空全部记忆"（records 置空）或"重置共享文件"
  （旧文件重命名 `.previous-<ts>.json` 后重建空文件）；该操作对本机所有产品生效。
- 换账号/换人使用同一台机器时，用户应手动清空或重置，避免记忆串用。

## 7. 兼容性

- 版本变更时递增 `version`，旧版本文件按 §2 拒绝读取并保留；新版本写入新文件。
- 本契约变更需同步更新各产品实现与文档（features.registry FEAT-020）。
