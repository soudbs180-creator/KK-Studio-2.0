# 设置页层级与说明收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将设置页的长说明收进标题后的可访问 info 提示，并统一模型接入、网络与 CLI 子页的标题、卡片层级和留白，同时保持现有业务行为。

**Architecture:** 在 settings 模块内新增一个轻量 `SettingsInfoHint`，只负责标题后的说明提示和 ARIA；顶层设置入口继续由 `SettingsSections` 渲染。模型接入、网络和 CLI 仅调整现有 JSX 分组与 CSS token 间距，不改状态、数据和连接调用链。

**Tech Stack:** React + TypeScript + CSS tokens + Playwright + Node test runner。

**Spec:** `docs/superpowers/specs/2026-11-10-settings-info-hierarchy-design.md`

## Global Constraints

- 保留 11 个设置入口、三层导航、路由兼容和所有业务字段/状态/错误原因。
- 只将长解释性文字收进 info 提示；短说明和安全/错误/运行状态继续可见。
- 复用 `UiIcon` 与现有 `--kk-*` token，不新增依赖，不改 Figma token 真值。
- 只在独立 worktree 修改，主 checkout 的 dirty 改动不混入。

## Review Focus

- 键盘只聚焦 info 按钮时提示必须可读，且 `aria-describedby` 指向稳定 tooltip：由 `SettingsInfoHint` 单测覆盖。
- 触摸/窄屏没有 hover 时仍能打开并关闭提示：由 settings 浏览器用例覆盖。
- 隐藏/非活动 tab 的提示不能抢焦点或遮挡当前面板：由模型接入浏览器用例覆盖。
- 长说明迁移后不能丢失错误、禁用原因和运行状态：由 provider/CLI/network 现有断言加回归断言覆盖。
- 统一间距不能产生横向溢出：由 settings-ss5 visual 与 page-alignment 用例覆盖。

### Task 1: 可访问说明提示组件

**Files:**
- Create: `src/components/settings/SettingsInfoHint.tsx`
- Modify: `src/components/settings/settings.css`
- Test: `tests/unit/settingsInfoHint.test.ts`

**Interfaces:**
- Produces `SettingsInfoHint({ id, label, children }: { id: string; label: string; children: ReactNode })`.
- Renders a button with `aria-label={label}`, a `circle-help` icon, and a tooltip element whose id is derived from `id`.

- [ ] **Step 1: Write the failing unit assertions** for stable tooltip ids, accessible label/description linkage, and open state after focus/click.
- [ ] **Step 2: Run the focused unit test** and confirm it fails because the component does not exist.
- [ ] **Step 3: Implement the smallest component** using React state and `UiIcon`; support mouse enter/leave, focus/blur, click toggle, Escape close, and `role="tooltip"` without global listeners.
- [ ] **Step 4: Add tokenized CSS** for a 16px inline icon slot, horizontal baseline alignment, and a positioned tooltip that stays inside the settings content bounds.
- [ ] **Step 5: Run the focused unit test** and confirm it passes.

### Task 2: 顶层设置说明与内容轴

**Files:**
- Modify: `src/components/settings/SettingsSections.tsx`
- Modify: `src/components/settings/settings.css`
- Test: `tests/browser/settings-ss5-visual.spec.ts`

**Interfaces:**
- Consumes `SettingsInfoHint` from Task 1.
- Keeps `SETTINGS_SECTIONS` data and existing network `<details>` behavior unchanged.

- [ ] **Step 1: Add browser assertions** that long section descriptions are absent from the normal flow, appear from the titled info button on focus/click, and short descriptions remain visible.
- [ ] **Step 2: Run the focused browser test** and capture the current failure.
- [ ] **Step 3: Change `SettingsSections`** to classify only descriptions longer than the agreed threshold as hint content, render the info button in the title row, and keep short descriptions as the existing paragraph.
- [ ] **Step 4: Adjust `.settings-section-body` and title-row styles** to use Figma-aligned `--kk-space-5` outer gap and `--kk-space-3` inner spacing without changing scroll ownership.
- [ ] **Step 5: Run the focused browser test** at 1200px and 390px and confirm no overflow or empty description containers.

### Task 3: 模型接入、网络和 CLI 统一重排

**Files:**
- Modify: `src/components/settings/ModelAccessSettings.tsx`
- Modify: `src/components/settings/ModelAccessApiPanel.tsx`
- Modify: `src/components/settings/ConnectionSettings.tsx`
- Modify: `src/components/settings/NativeCliControls.tsx`
- Modify: `src/components/settings/NativeCliFacts.tsx`
- Modify: `src/components/settings/CodeBuddyConnectionSettings.tsx`
- Modify: `src/components/settings/AgentConnectionSettings.tsx`
- Modify: `src/components/settings/GoogleConnectionSettings.tsx`
- Modify: `src/components/settings/settings.css`
- Test: `tests/browser/provider-cli-settings.spec.ts`, `tests/browser/native-cli-ui.spec.ts`, `tests/browser/settings-ss5-visual.spec.ts`

**Interfaces:**
- Consumes `SettingsInfoHint` from Task 1.
- Produces no new business callbacks; existing provider, Agent, Gemini CLI and CodeBuddy handlers remain unchanged.

- [ ] **Step 1: Add/adjust browser assertions** for the single content axis, title-row hints, visible status/error text, and no nested redundant intro paragraphs in official/CLI/network views.
- [ ] **Step 2: Run the focused browser tests** to record the pre-change layout failures or current assertions.
- [ ] **Step 3: Recompose the existing JSX** into Figma-aligned title rows and flat card groups: channel title + tabs, active panel heading + controls, CLI tool selector + one tool panel, and network heading + status + controls. Move only explanatory paragraphs to `SettingsInfoHint`; keep operational text in place.
- [ ] **Step 4: Normalize CSS gaps, padding, and heading alignment** to existing settings tokens; remove duplicate margins and nested card padding that create the cramped hierarchy.
- [ ] **Step 5: Run the focused browser tests** across 1200/1099/390 widths and verify provider/CLI/network interactions still work.

### Task 4: Gate verification and evidence

**Files:**
- Modify: `docs/governance/ai-memory/memlog.md`
- Create: `output/settings-info-hierarchy-20261110/verification.md`

- [ ] **Step 1: Run targeted unit and browser suites** for SettingsInfoHint, settings consolidation, provider/CLI settings, and visual layout.
- [ ] **Step 2: Run project gates** `npm run typecheck`, `npm run lint`, `npm run rules:check`, `npm run ui:check`, and the relevant `npm test` subset.
- [ ] **Step 3: Record screenshots/DOM geometry, Figma node/session evidence, pass/fail status, and unverified real-provider/Desktop boundaries in the verification report.
- [ ] **Step 4: Append the required handoff entry to `docs/governance/ai-memory/memlog.md`.
