---
name: KK Studio
version: alpha
description: >-
  A creative workbench with quiet semantic surfaces, readable compact controls, and explicit state. Green marks selection; ordinary Primary actions use contrasting neutral surfaces.
colors:
  primary: "#21a673"
  primary-hover: "#2fbe86"
  primary-soft: "#7fd6b2"
  on-primary: "#0a0a0a"
  background: "#0a0a0a"
  surface: "#161616"
  surface-container: "#1a1a1a"
  surface-container-high: "#202020"
  surface-variant: "#333333"
  outline: "#3c3c3c"
  outline-control: "#858585"
  outline-variant: "#292929"
  input: "#1f1f1f"
  selected: "#2a2a2a"
  on-surface: "#dbdbdb"
  on-surface-variant: "#a0a0a0"
  text-tertiary: "#9e9e9e"
  text-accent: "#7fd6b2"
  error: "#b4233c"
  on-error: "#ff8585"
  success: "#79cda8"
  warning: "#e6b96a"
  focus: "#7fd6b2"
  button-primary: "#e9e9e9"
  button-primary-hover: "#ffffff"
  on-button-primary: "#161616"
  light-primary: "#21a673"
  light-primary-hover: "#2fbe86"
  light-primary-soft: "#7fd6b2"
  light-on-primary: "#0a0a0a"
  light-background: "#ededed"
  light-surface: "#ffffff"
  light-surface-container: "#eeeeee"
  light-surface-container-high: "#ececec"
  light-surface-variant: "#eaeaea"
  light-outline: "#c4c4c4"
  light-outline-control: "#777777"
  light-outline-variant: "#dedede"
  light-input: "#e9e9e9"
  light-selected: "#e0e0e0"
  light-on-surface: "#252525"
  light-on-surface-variant: "#626262"
  light-text-tertiary: "#636363"
  light-text-accent: "#166443"
  light-error: "#aa263b"
  light-on-error: "#aa263b"
  light-success: "#216947"
  light-warning: "#8a590c"
  light-focus: "#166443"
  light-button-primary: "#252525"
  light-button-primary-hover: "#3c3c3c"
  light-on-button-primary: "#ffffff"
typography:
  caption:
    fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 12px
    lineHeight: "1.3333333333333333"
    fontWeight: 400
  body:
    fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 14px
    lineHeight: "1.4285714285714286"
    fontWeight: 400
  body-strong:
    fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 14px
    lineHeight: "1.4285714285714286"
    fontWeight: 600
  subtitle:
    fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 16px
    lineHeight: "1.5"
    fontWeight: 600
  title:
    fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 20px
    lineHeight: "1.4"
    fontWeight: 700
  display:
    fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 26px
    lineHeight: "1.2307692307692308"
    fontWeight: 700
rounded:
  none: 0px
  xs: 4px
  sm: 8px
  control: 8px
  menu: 10px
  lg: 16px
  panel: 20px
  card: 20px
  full: 999px
spacing:
  space-hair: 2px
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-5: 24px
  space-6: 40px
  layout-gutter-sm: 20px
  layout-gutter-md: 32px
  layout-gutter-lg: 48px
  layout-gutter-xl: 64px
  container-pad: 40px
  control-px-sm: 12px
  control-px-md: 12px
  control-px-lg: 16px
  control-px-xl: 20px
  control-gap-sm: 4px
  control-gap-md: 8px
  control-gap-lg: 8px
  control-gap-xl: 8px
components:
  button-primary:
    backgroundColor: "{colors.button-primary}"
    textColor: "{colors.on-button-primary}"
    rounded: "{rounded.full}"
    height: 40px
    typography: "{typography.body-strong}"
  button-primary-hover:
    backgroundColor: "{colors.button-primary-hover}"
    textColor: "{colors.on-button-primary}"
    rounded: "{rounded.full}"
    height: 40px
    typography: "{typography.body-strong}"
  button-secondary:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    height: 32px
    typography: "{typography.body-strong}"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    height: 32px
    typography: "{typography.body}"
  icon-button:
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.sm}"
    height: 32px
    padding: 4px
  light-button-primary:
    backgroundColor: "{colors.light-button-primary}"
    textColor: "{colors.light-on-button-primary}"
    rounded: "{rounded.full}"
    height: 40px
    typography: "{typography.body-strong}"
  light-button-primary-hover:
    backgroundColor: "{colors.light-button-primary-hover}"
    textColor: "{colors.light-on-button-primary}"
    rounded: "{rounded.full}"
    height: 40px
    typography: "{typography.body-strong}"
  light-button-secondary:
    backgroundColor: "{colors.light-surface-container-high}"
    textColor: "{colors.light-on-surface}"
    rounded: "{rounded.full}"
    height: 32px
    typography: "{typography.body-strong}"
  light-input:
    backgroundColor: "{colors.light-input}"
    textColor: "{colors.light-on-surface}"
    rounded: "{rounded.sm}"
    height: 32px
    typography: "{typography.body}"
  light-icon-button:
    textColor: "{colors.light-on-surface-variant}"
    rounded: "{rounded.sm}"
    height: 32px
    padding: 4px
x-kk-studio:
  source: src/styles/tokens.css
  sha256: 741f1739101b5cb1d407b65929a9e133d9a363390239a066005d95ee4d5d8138
  hashEncoding: utf8-lf
  scopes:
    - selector: :root
      atRules: []
      declarations:
        - property: --kk-image-scratch-opacity
          value: "0.55"
          important: false
        - property: --kk-image-editor-max-width
          value: 1280px
          important: false
        - property: --kk-image-editor-min-stage
          value: 160px
          important: false
        - property: --kk-image-brush-slider-width
          value: 96px
          important: false
        - property: --kk-image-editor-input-max-height
          value: 120px
          important: false
        - property: --kk-image-annotation-label-width
          value: 200px
          important: false
        - property: --kk-image-annotation-label-text
          value: "#ffffff"
          important: false
        - property: --kk-image-model-width
          value: 240px
          important: false
        - property: --kk-image-region-input-width
          value: 280px
          important: false
        - property: --kk-image-lightbox-thumb-width
          value: 96px
          important: false
        - property: --kk-image-lightbox-thumb-height
          value: 64px
          important: false
        - property: --kk-dark-1
          value: "#161616"
          important: false
        - property: --kk-dark-2
          value: "#1a1a1a"
          important: false
        - property: --kk-dark-4
          value: "#202020"
          important: false
        - property: --kk-dark-6
          value: "#292929"
          important: false
        - property: --kk-dark-7
          value: "#333333"
          important: false
        - property: --kk-dark-8
          value: "#3c3c3c"
          important: false
        - property: --kk-gold
          value: "#d98a00"
          important: false
        - property: --kk-font-sans
          value: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
          important: false
        - property: --kk-font-mono
          value: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
          important: false
        - property: --kk-weight-regular
          value: "400"
          important: false
        - property: --kk-weight-medium
          value: "500"
          important: false
        - property: --kk-weight-semibold
          value: "600"
          important: false
        - property: --kk-weight-bold
          value: "700"
          important: false
        - property: --kk-tracking-tighter
          value: -0.4px
          important: false
        - property: --kk-tracking-tight
          value: -0.2px
          important: false
        - property: --kk-tracking-normal
          value: 0px
          important: false
        - property: --kk-tracking-wide
          value: 0.4px
          important: false
        - property: --kk-space-hair
          value: 2px
          important: false
        - property: --kk-space-1
          value: 4px
          important: false
        - property: --kk-space-2
          value: 8px
          important: false
        - property: --kk-space-3
          value: 12px
          important: false
        - property: --kk-space-4
          value: 16px
          important: false
        - property: --kk-space-5
          value: 24px
          important: false
        - property: --kk-space-6
          value: 40px
          important: false
        - property: --kk-radius-0
          value: "0"
          important: false
        - property: --kk-radius-xs
          value: 4px
          important: false
        - property: --kk-radius-sm
          value: 8px
          important: false
        - property: --kk-radius-control
          value: 8px
          important: false
        - property: --kk-radius-menu
          value: 10px
          important: false
        - property: --kk-radius-lg
          value: 16px
          important: false
        - property: --kk-radius-panel
          value: 20px
          important: false
        - property: --kk-radius-card
          value: 20px
          important: false
        - property: --kk-radius-full
          value: 999px
          important: false
        - property: --kk-font-caption
          value: 12px
          important: false
        - property: --kk-font-body
          value: 14px
          important: false
        - property: --kk-font-body-strong
          value: 14px
          important: false
        - property: --kk-font-subtitle
          value: 16px
          important: false
        - property: --kk-font-title
          value: 20px
          important: false
        - property: --kk-font-display
          value: 26px
          important: false
        - property: --kk-line-caption
          value: 16px
          important: false
        - property: --kk-line-body
          value: 20px
          important: false
        - property: --kk-line-body-strong
          value: 20px
          important: false
        - property: --kk-line-subtitle
          value: 24px
          important: false
        - property: --kk-line-title
          value: 28px
          important: false
        - property: --kk-line-display
          value: 32px
          important: false
        - property: --kk-font-weight-caption
          value: "400"
          important: false
        - property: --kk-font-weight-body
          value: "400"
          important: false
        - property: --kk-font-weight-body-strong
          value: "600"
          important: false
        - property: --kk-font-weight-subtitle
          value: "600"
          important: false
        - property: --kk-font-weight-title
          value: "700"
          important: false
        - property: --kk-font-weight-display
          value: "700"
          important: false
        - property: --kk-bg-app
          value: "#0a0a0a"
          important: false
        - property: --kk-bg-card
          value: "#1a1a1a"
          important: false
        - property: --kk-bg-elevated
          value: "#202020"
          important: false
        - property: --kk-bg-soft
          value: "#333333"
          important: false
        - property: --kk-bg-surface
          value: "#161616"
          important: false
        - property: --kk-border-default
          value: "#3c3c3c"
          important: false
        - property: --kk-border-control
          value: "#858585"
          important: false
        - property: --kk-border-subtle
          value: "#292929"
          important: false
        - property: --kk-bg-input
          value: "#1f1f1f"
          important: false
        - property: --kk-neutral-selected
          value: "#2a2a2a"
          important: false
        - property: --kk-text-primary
          value: "#dbdbdb"
          important: false
        - property: --kk-text-secondary
          value: "#a0a0a0"
          important: false
        - property: --kk-text-tertiary
          value: "#9e9e9e"
          important: false
        - property: --kk-text-accent
          value: "#7fd6b2"
          important: false
        - property: --kk-text-danger
          value: "#ff8585"
          important: false
        - property: --kk-danger
          value: "#b4233c"
          important: false
        - property: --kk-success
          value: "#79cda8"
          important: false
        - property: --kk-warning
          value: "#e6b96a"
          important: false
        - property: --kk-focus-ring
          value: "#7fd6b2"
          important: false
        - property: --kk-focus-ring-subtle
          value: rgba(255, 255, 255, 0.58)
          important: false
        - property: --kk-shadow-color
          value: rgba(0, 0, 0, 0.5)
          important: false
        - property: --kk-shadow-color-strong
          value: rgba(0, 0, 0, 0.7)
          important: false
        - property: --kk-overlay
          value: rgba(10, 10, 10, 0.72)
          important: false
        - property: --kk-like-start
          value: "#ef6d6d"
          important: false
        - property: --kk-like-end
          value: "#d94063"
          important: false
        - property: --kk-star-start
          value: "#e6b96a"
          important: false
        - property: --kk-star-end
          value: "#ee8b3a"
          important: false
        - property: --kk-border-none
          value: "0"
          important: false
        - property: --kk-border-width
          value: 1px
          important: false
        - property: --kk-border-width-focus
          value: 2px
          important: false
        - property: --kk-focus-width-subtle
          value: 1px
          important: false
        - property: --kk-focus-offset-subtle
          value: 1px
          important: false
        - property: --kk-z-base
          value: "0"
          important: false
        - property: --kk-z-sticky
          value: "10"
          important: false
        - property: --kk-z-sticky-header
          value: "20"
          important: false
        - property: --kk-z-dropdown
          value: "100"
          important: false
        - property: --kk-z-canvas-editor
          value: calc(var(--kk-z-dropdown) + 1)
          important: false
        - property: --kk-z-canvas-menu
          value: calc(var(--kk-z-canvas-editor) + 1)
          important: false
        - property: --kk-z-floating-panel
          value: calc(var(--kk-z-canvas-menu) + 1)
          important: false
        - property: --kk-z-floating-panel-active
          value: calc(var(--kk-z-floating-panel) + 1)
          important: false
        - property: --kk-z-overlay
          value: "200"
          important: false
        - property: --kk-z-modal
          value: "300"
          important: false
        - property: --kk-z-popover
          value: "400"
          important: false
        - property: --kk-z-toast
          value: "500"
          important: false
        - property: --kk-elevation-0
          value: none
          important: false
        - property: --kk-elevation-1
          value: 0 1px 2px var(--kk-shadow-color)
          important: false
        - property: --kk-elevation-2
          value: 0 4px 12px var(--kk-shadow-color)
          important: false
        - property: --kk-elevation-3
          value: 0 12px 32px var(--kk-shadow-color-strong)
          important: false
        - property: --kk-layout-gutter-sm
          value: 20px
          important: false
        - property: --kk-layout-gutter-md
          value: 32px
          important: false
        - property: --kk-layout-gutter-lg
          value: 48px
          important: false
        - property: --kk-layout-gutter-xl
          value: 64px
          important: false
        - property: --kk-container-max-width
          value: 1440px
          important: false
        - property: --kk-container-pad
          value: 40px
          important: false
        - property: --kk-sidebar-width
          value: 291px
          important: false
        - property: --kk-panel-width
          value: 264px
          important: false
        - property: --kk-toolbar-height
          value: 50px
          important: false
        - property: --kk-topbar-height
          value: 40px
          important: false
        - property: --kk-control-h-sm
          value: 24px
          important: false
        - property: --kk-control-h-md
          value: 32px
          important: false
        - property: --kk-control-h-lg
          value: 40px
          important: false
        - property: --kk-control-h-xl
          value: 40px
          important: false
        - property: --kk-control-px-sm
          value: 12px
          important: false
        - property: --kk-control-px-md
          value: 12px
          important: false
        - property: --kk-control-px-lg
          value: 16px
          important: false
        - property: --kk-control-px-xl
          value: 20px
          important: false
        - property: --kk-control-gap-sm
          value: 4px
          important: false
        - property: --kk-control-gap-md
          value: 8px
          important: false
        - property: --kk-control-gap-lg
          value: 8px
          important: false
        - property: --kk-control-gap-xl
          value: 8px
          important: false
        - property: --kk-control-font-sm
          value: 12px
          important: false
        - property: --kk-control-font-md
          value: 14px
          important: false
        - property: --kk-control-font-lg
          value: 14px
          important: false
        - property: --kk-control-font-xl
          value: 14px
          important: false
        - property: --kk-control-icon-sm
          value: 16px
          important: false
        - property: --kk-control-icon-md
          value: 20px
          important: false
        - property: --kk-control-icon-lg
          value: 24px
          important: false
        - property: --kk-control-icon-xl
          value: 24px
          important: false
        - property: --kk-icon-glyph-sm
          value: 16px
          important: false
        - property: --kk-icon-glyph-md
          value: 20px
          important: false
        - property: --kk-icon-glyph-lg
          value: 24px
          important: false
        - property: --kk-hit-min
          value: 24px
          important: false
        - property: --kk-hit-key
          value: 32px
          important: false
        - property: --kk-hit-primary
          value: 40px
          important: false
        - property: --kk-accent
          value: "#21a673"
          important: false
        - property: --kk-accent-hover
          value: "#2fbe86"
          important: false
        - property: --kk-accent-soft
          value: "#7fd6b2"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
        - property: --kk-button-h-standard
          value: var(--kk-control-h-md)
          important: false
        - property: --kk-button-h-primary
          value: var(--kk-control-h-lg)
          important: false
        - property: --kk-button-h
          value: var(--kk-button-h-standard)
          important: false
        - property: --kk-button-px
          value: var(--kk-control-px-lg)
          important: false
        - property: --kk-button-gap
          value: var(--kk-control-gap-lg)
          important: false
        - property: --kk-button-font
          value: var(--kk-control-font-lg)
          important: false
        - property: --kk-button-icon
          value: var(--kk-control-icon-lg)
          important: false
        - property: --kk-button-radius
          value: var(--kk-radius-full)
          important: false
        - property: --kk-button-primary-bg
          value: "#e9e9e9"
          important: false
        - property: --kk-button-primary-hover
          value: "#ffffff"
          important: false
        - property: --kk-button-primary-text
          value: "#161616"
          important: false
        - property: --kk-button-compact-h
          value: var(--kk-control-h-md)
          important: false
        - property: --kk-button-compact-px
          value: var(--kk-control-px-md)
          important: false
        - property: --kk-button-compact-font
          value: var(--kk-control-font-md)
          important: false
        - property: --kk-button-compact-icon
          value: var(--kk-control-icon-md)
          important: false
        - property: --kk-input-h
          value: var(--kk-control-h-md)
          important: false
        - property: --kk-input-px
          value: var(--kk-control-px-md)
          important: false
        - property: --kk-input-gap
          value: var(--kk-control-gap-md)
          important: false
        - property: --kk-input-font
          value: var(--kk-control-font-md)
          important: false
        - property: --kk-input-icon
          value: var(--kk-control-icon-md)
          important: false
        - property: --kk-input-radius
          value: var(--kk-radius-control)
          important: false
        - property: --kk-select-h
          value: var(--kk-control-h-lg)
          important: false
        - property: --kk-select-px
          value: var(--kk-control-px-lg)
          important: false
        - property: --kk-select-font
          value: var(--kk-control-font-lg)
          important: false
        - property: --kk-select-icon
          value: var(--kk-control-icon-lg)
          important: false
        - property: --kk-select-radius
          value: var(--kk-radius-control)
          important: false
        - property: --kk-select-menu-radius
          value: var(--kk-radius-menu)
          important: false
        - property: --kk-icon-button-h
          value: var(--kk-control-h-md)
          important: false
        - property: --kk-icon-button-lg
          value: var(--kk-control-h-lg)
          important: false
        - property: --kk-icon-button-xl
          value: var(--kk-control-h-xl)
          important: false
        - property: --kk-icon-button-radius
          value: var(--kk-radius-control)
          important: false
        - property: --kk-menu-item-h
          value: 36px
          important: false
        - property: --kk-badge-h
          value: 20px
          important: false
        - property: --kk-capsule-h
          value: 28px
          important: false
        - property: --kk-capsule-lg-h
          value: 32px
          important: false
        - property: --kk-menu-indent
          value: 16px
          important: false
        - property: --kk-card-pad
          value: var(--kk-space-4)
          important: false
        - property: --kk-card-radius
          value: var(--kk-radius-card)
          important: false
        - property: --kk-panel-radius
          value: var(--kk-radius-panel)
          important: false
        - property: --kk-toolbar-h
          value: var(--kk-toolbar-height)
          important: false
        - property: --kk-task-workbench-width
          value: 1100px
          important: false
        - property: --kk-task-workbench-height
          value: 760px
          important: false
        - property: --kk-task-queue-width
          value: 220px
          important: false
        - property: --kk-task-popover-width
          value: 360px
          important: false
        - property: --kk-account-popup-width
          value: 320px
          important: false
        - property: --kk-task-popover-height
          value: 420px
          important: false
        - property: --kk-task-popover-min-height
          value: 300px
          important: false
        - property: --kk-settings-width
          value: 1120px
          important: false
        - property: --kk-settings-compact-width
          value: 960px
          important: false
        - property: --kk-settings-height
          value: 680px
          important: false
        - property: --kk-settings-nav-width
          value: 208px
          important: false
        - property: --kk-settings-method-width
          value: 160px
          important: false
        - property: --kk-canvas-screen-editor-width
          value: 590px
          important: false
        - property: --kk-canvas-screen-editor-bottom
          value: 152px
          important: false
        - property: --kk-canvas-screen-editor-max-height
          value: min(45dvh, calc(100dvh - 232px))
          important: false
        - property: --kk-collection-panel-width
          value: 360px
          important: false
        - property: --kk-collection-panel-height
          value: 480px
          important: false
        - property: --kk-model-capsule-max-width
          value: 260px
          important: false
    - selector: '[data-theme="light"]'
      atRules: []
      declarations:
        - property: --kk-bg-app
          value: "#ededed"
          important: false
        - property: --kk-bg-card
          value: "#eeeeee"
          important: false
        - property: --kk-bg-elevated
          value: "#ececec"
          important: false
        - property: --kk-bg-soft
          value: "#eaeaea"
          important: false
        - property: --kk-bg-surface
          value: "#ffffff"
          important: false
        - property: --kk-border-default
          value: "#c4c4c4"
          important: false
        - property: --kk-border-control
          value: "#777777"
          important: false
        - property: --kk-border-subtle
          value: "#dedede"
          important: false
        - property: --kk-bg-input
          value: "#e9e9e9"
          important: false
        - property: --kk-neutral-selected
          value: "#e0e0e0"
          important: false
        - property: --kk-text-primary
          value: "#252525"
          important: false
        - property: --kk-text-secondary
          value: "#626262"
          important: false
        - property: --kk-text-tertiary
          value: "#636363"
          important: false
        - property: --kk-text-accent
          value: "#166443"
          important: false
        - property: --kk-text-danger
          value: "#aa263b"
          important: false
        - property: --kk-danger
          value: "#aa263b"
          important: false
        - property: --kk-success
          value: "#216947"
          important: false
        - property: --kk-warning
          value: "#8a590c"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
        - property: --kk-focus-ring
          value: "#166443"
          important: false
        - property: --kk-focus-ring-subtle
          value: rgba(0, 0, 0, 0.4)
          important: false
        - property: --kk-shadow-color
          value: rgba(0, 0, 0, 0.12)
          important: false
        - property: --kk-shadow-color-strong
          value: rgba(0, 0, 0, 0.2)
          important: false
        - property: --kk-overlay
          value: rgba(237, 237, 237, 0.72)
          important: false
        - property: --kk-button-primary-bg
          value: "#252525"
          important: false
        - property: --kk-button-primary-hover
          value: "#3c3c3c"
          important: false
        - property: --kk-button-primary-text
          value: "#ffffff"
          important: false
        - property: --kk-like-start
          value: "#aa263b"
          important: false
        - property: --kk-like-end
          value: "#8f1f37"
          important: false
        - property: --kk-star-start
          value: "#8a590c"
          important: false
        - property: --kk-star-end
          value: "#b66c1d"
          important: false
    - selector: '[data-accent="blue"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#2f80ed"
          important: false
        - property: --kk-accent-hover
          value: "#4d9aff"
          important: false
        - property: --kk-accent-soft
          value: "#8cc2ff"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: '[data-accent="green"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#21a673"
          important: false
        - property: --kk-accent-hover
          value: "#2fbe86"
          important: false
        - property: --kk-accent-soft
          value: "#7fd6b2"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: '[data-accent="yellow"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#e6b96a"
          important: false
        - property: --kk-accent-hover
          value: "#f0c97e"
          important: false
        - property: --kk-accent-soft
          value: "#f3d9a8"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: '[data-accent="pink"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#e86fa4"
          important: false
        - property: --kk-accent-hover
          value: "#f08bb8"
          important: false
        - property: --kk-accent-soft
          value: "#f4b7d2"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: '[data-accent="orange"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#ee8b3a"
          important: false
        - property: --kk-accent-hover
          value: "#f5a05e"
          important: false
        - property: --kk-accent-soft
          value: "#f8c294"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: '[data-accent="purple"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#8b5cf6"
          important: false
        - property: --kk-accent-hover
          value: "#a78bfa"
          important: false
        - property: --kk-accent-soft
          value: "#cfc0fe"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: '[data-accent="white"]'
      atRules: []
      declarations:
        - property: --kk-accent
          value: "#ffffff"
          important: false
        - property: --kk-accent-hover
          value: "#e8e8e8"
          important: false
        - property: --kk-accent-soft
          value: "#dbdbdb"
          important: false
        - property: --kk-on-accent
          value: "#0a0a0a"
          important: false
    - selector: |-
        [data-accent="blue"],
        [data-accent="green"],
        [data-accent="yellow"],
        [data-accent="pink"],
        [data-accent="orange"],
        [data-accent="purple"],
        [data-accent="white"]
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: var(--kk-accent-soft)
          important: false
        - property: --kk-focus-ring
          value: var(--kk-text-accent)
          important: false
    - selector: '[data-theme="light"][data-accent="blue"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#1458a5"
          important: false
    - selector: '[data-theme="light"][data-accent="green"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#166443"
          important: false
    - selector: '[data-theme="light"][data-accent="yellow"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#78510a"
          important: false
    - selector: '[data-theme="light"][data-accent="pink"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#a12659"
          important: false
    - selector: '[data-theme="light"][data-accent="orange"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#94420c"
          important: false
    - selector: '[data-theme="light"][data-accent="purple"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#6534b0"
          important: false
    - selector: '[data-theme="light"][data-accent="white"]'
      atRules: []
      declarations:
        - property: --kk-text-accent
          value: "#252525"
          important: false
    - selector: '[data-density="compact"]'
      atRules: []
      declarations:
        - property: --kk-control-h-sm
          value: 24px
          important: false
        - property: --kk-control-h-md
          value: 32px
          important: false
        - property: --kk-control-h-lg
          value: 40px
          important: false
        - property: --kk-control-h-xl
          value: 40px
          important: false
        - property: --kk-control-px-sm
          value: 8px
          important: false
        - property: --kk-control-px-md
          value: 8px
          important: false
        - property: --kk-control-px-lg
          value: 12px
          important: false
        - property: --kk-control-px-xl
          value: 12px
          important: false
        - property: --kk-layout-gutter-sm
          value: 16px
          important: false
        - property: --kk-layout-gutter-md
          value: 24px
          important: false
        - property: --kk-layout-gutter-lg
          value: 32px
          important: false
        - property: --kk-layout-gutter-xl
          value: 48px
          important: false
        - property: --kk-card-pad
          value: var(--kk-space-3)
          important: false
    - selector: :root
      atRules:
        - "@media (max-width: 767px)"
      declarations:
        - property: --kk-container-pad
          value: 16px
          important: false
    - selector: :root
      atRules:
        - "@media (min-width: 768px) and (max-width: 1199px)"
      declarations:
        - property: --kk-container-pad
          value: 24px
          important: false
    - selector: :root
      atRules:
        - "@media (min-width: 1200px)"
      declarations:
        - property: --kk-container-pad
          value: 40px
          important: false
  managedPaths:
    - - colors
      - primary
    - - colors
      - primary-hover
    - - colors
      - primary-soft
    - - colors
      - on-primary
    - - colors
      - background
    - - colors
      - surface
    - - colors
      - surface-container
    - - colors
      - surface-container-high
    - - colors
      - surface-variant
    - - colors
      - outline
    - - colors
      - outline-control
    - - colors
      - outline-variant
    - - colors
      - input
    - - colors
      - selected
    - - colors
      - on-surface
    - - colors
      - on-surface-variant
    - - colors
      - text-tertiary
    - - colors
      - text-accent
    - - colors
      - error
    - - colors
      - on-error
    - - colors
      - success
    - - colors
      - warning
    - - colors
      - focus
    - - colors
      - button-primary
    - - colors
      - button-primary-hover
    - - colors
      - on-button-primary
    - - colors
      - light-primary
    - - colors
      - light-primary-hover
    - - colors
      - light-primary-soft
    - - colors
      - light-on-primary
    - - colors
      - light-background
    - - colors
      - light-surface
    - - colors
      - light-surface-container
    - - colors
      - light-surface-container-high
    - - colors
      - light-surface-variant
    - - colors
      - light-outline
    - - colors
      - light-outline-control
    - - colors
      - light-outline-variant
    - - colors
      - light-input
    - - colors
      - light-selected
    - - colors
      - light-on-surface
    - - colors
      - light-on-surface-variant
    - - colors
      - light-text-tertiary
    - - colors
      - light-text-accent
    - - colors
      - light-error
    - - colors
      - light-on-error
    - - colors
      - light-success
    - - colors
      - light-warning
    - - colors
      - light-focus
    - - colors
      - light-button-primary
    - - colors
      - light-button-primary-hover
    - - colors
      - light-on-button-primary
    - - typography
      - caption
      - fontFamily
    - - typography
      - caption
      - fontSize
    - - typography
      - caption
      - lineHeight
    - - typography
      - caption
      - fontWeight
    - - typography
      - body
      - fontFamily
    - - typography
      - body
      - fontSize
    - - typography
      - body
      - lineHeight
    - - typography
      - body
      - fontWeight
    - - typography
      - body-strong
      - fontFamily
    - - typography
      - body-strong
      - fontSize
    - - typography
      - body-strong
      - lineHeight
    - - typography
      - body-strong
      - fontWeight
    - - typography
      - subtitle
      - fontFamily
    - - typography
      - subtitle
      - fontSize
    - - typography
      - subtitle
      - lineHeight
    - - typography
      - subtitle
      - fontWeight
    - - typography
      - title
      - fontFamily
    - - typography
      - title
      - fontSize
    - - typography
      - title
      - lineHeight
    - - typography
      - title
      - fontWeight
    - - typography
      - display
      - fontFamily
    - - typography
      - display
      - fontSize
    - - typography
      - display
      - lineHeight
    - - typography
      - display
      - fontWeight
    - - rounded
      - none
    - - rounded
      - xs
    - - rounded
      - sm
    - - rounded
      - control
    - - rounded
      - menu
    - - rounded
      - lg
    - - rounded
      - panel
    - - rounded
      - card
    - - rounded
      - full
    - - spacing
      - space-hair
    - - spacing
      - space-1
    - - spacing
      - space-2
    - - spacing
      - space-3
    - - spacing
      - space-4
    - - spacing
      - space-5
    - - spacing
      - space-6
    - - spacing
      - layout-gutter-sm
    - - spacing
      - layout-gutter-md
    - - spacing
      - layout-gutter-lg
    - - spacing
      - layout-gutter-xl
    - - spacing
      - container-pad
    - - spacing
      - control-px-sm
    - - spacing
      - control-px-md
    - - spacing
      - control-px-lg
    - - spacing
      - control-px-xl
    - - spacing
      - control-gap-sm
    - - spacing
      - control-gap-md
    - - spacing
      - control-gap-lg
    - - spacing
      - control-gap-xl
    - - components
      - button-primary
      - backgroundColor
    - - components
      - button-primary
      - textColor
    - - components
      - button-primary
      - rounded
    - - components
      - button-primary
      - height
    - - components
      - button-primary
      - typography
    - - components
      - button-primary-hover
      - backgroundColor
    - - components
      - button-primary-hover
      - textColor
    - - components
      - button-primary-hover
      - rounded
    - - components
      - button-primary-hover
      - height
    - - components
      - button-primary-hover
      - typography
    - - components
      - button-secondary
      - backgroundColor
    - - components
      - button-secondary
      - textColor
    - - components
      - button-secondary
      - rounded
    - - components
      - button-secondary
      - height
    - - components
      - button-secondary
      - typography
    - - components
      - input
      - backgroundColor
    - - components
      - input
      - textColor
    - - components
      - input
      - rounded
    - - components
      - input
      - height
    - - components
      - input
      - typography
    - - components
      - icon-button
      - textColor
    - - components
      - icon-button
      - rounded
    - - components
      - icon-button
      - height
    - - components
      - icon-button
      - padding
    - - components
      - light-button-primary
      - backgroundColor
    - - components
      - light-button-primary
      - textColor
    - - components
      - light-button-primary
      - rounded
    - - components
      - light-button-primary
      - height
    - - components
      - light-button-primary
      - typography
    - - components
      - light-button-primary-hover
      - backgroundColor
    - - components
      - light-button-primary-hover
      - textColor
    - - components
      - light-button-primary-hover
      - rounded
    - - components
      - light-button-primary-hover
      - height
    - - components
      - light-button-primary-hover
      - typography
    - - components
      - light-button-secondary
      - backgroundColor
    - - components
      - light-button-secondary
      - textColor
    - - components
      - light-button-secondary
      - rounded
    - - components
      - light-button-secondary
      - height
    - - components
      - light-button-secondary
      - typography
    - - components
      - light-input
      - backgroundColor
    - - components
      - light-input
      - textColor
    - - components
      - light-input
      - rounded
    - - components
      - light-input
      - height
    - - components
      - light-input
      - typography
    - - components
      - light-icon-button
      - textColor
    - - components
      - light-icon-button
      - rounded
    - - components
      - light-icon-button
      - height
    - - components
      - light-icon-button
      - padding
---

# KK Studio Design System

## Overview

This is the global design overview and portable token index for KK Studio.
[UI_INDEX](docs/UI_INDEX.md) routes each topic to its canonical specification;
this overview does not duplicate those rules or create a second runtime source.
Current user requirements and confirmed feedback take precedence over registered
tokens and shared components, then historical Figma baselines still applicable.
The [approved unified specification](docs/changes/2026-10-15-kk-unified/spec.md)
remains authoritative for settings, model selection, data, tasks, and platform scope.

The workbench keeps images, video, and the current task prominent. Navigation
uses a consistent content axis, compact spacing, and clear action hierarchy.
Desktop delivery comes first, Web follows its shared core, and native Mobile
belongs to its separate delivery task. Narrow browser evidence is responsive Web.

All numeric values come from [tokens.css](src/styles/tokens.css). The YAML above
is generated by `npm run design:sync`: portable roles plus a lossless declaration
projection with selectors, media scopes, importance, ownership paths, and source
SHA-256 of UTF-8 CSS with LF line endings, keeping Windows/Linux identity stable.
Human prose, unknown YAML, and comments survive synchronization. Edit
values in CSS, then sync and review the diff. Runtime aliases remain compatibility
mappings, never a second numeric source. The [token index](docs/DESIGN_TOKENS.md)
identifies actual component roles and consumers.

The format follows the [Google DESIGN.md alpha specification](https://github.com/google-labs-code/design.md/blob/9bf8eae67128b6cc55ad9bf86665767deb4c11cd/docs/spec.md).
The [Mobbin reference](https://getdesign.md/mobbin/design-md) is an independent
VoltAgent analysis of observable patterns, not an official Mobbin specification.
Its content hierarchy, control grouping, and spacing rhythm are inspiration;
its white surfaces and blue accent do not replace KK's approved semantic colors.
External prose is reference material, not permission to modify product behavior.

## Colors

Use the theme and state roles in [DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md).
Dark is the default; light changes the same semantic roles. Default accent is
green, while explicitly saved accents and their preference identities persist.
Primary expresses hierarchy through a contrasting neutral surface. State and
selection use semantic accent roles rather than coloring every action green.

Default, hover, active/pressed, selected, disabled, and keyboard focus must
consume the same role family across all callers. Pair state color with text or
an icon; verify text and control contrast in both themes and each supported accent.
Registered values are the baseline; contrast findings require an explicit shared
source correction and review, never an undocumented preview-only palette.

## Typography

Consume paired font and line-height roles from [tokens.css](src/styles/tokens.css)
and the readable-label contract in [UI_RULES](docs/UI_RULES.md). Inter and the
registered Chinese/system fallbacks serve UI text; the registered monospace
family serves technical content. Body, emphasized body, caption, subtitle,
title, and display form one hierarchy. Visible UI text is at least 12px.

Ordinary labels stay complete. At the container limit, long names may truncate
with a complete accessible name or title. Center icon and text as one group,
keep baselines aligned, and preserve wrapping for explanatory content. Icons
use [UiIcon](src/components/UiIcon.tsx) or existing Figma assets; glyph scale
and pointer target are distinct. Do not synthesize Chinese italics or use an
unregistered icon, text size, or weight to compensate for a layout problem.

## Layout

Choose one page template from [UI_ARCHETYPES](docs/UI_ARCHETYPES.md), one content
axis, and one Primary action for the current view. Home, chat, canvas, project
library, asset library, editors, and every settings category share these rules;
a successful component preview does not prove those pages comply.

Settings reuse the compact shell and classified navigation roles in the
[token index](docs/DESIGN_TOKENS.md). Long content scrolls inside its own pane;
hidden forms do not determine shell width. Breakpoints change container width
and arrangement, preserving the same internal dimensions and controls. Continuous
resize must retain selection, drafts, parameters, open workflow context, and
valid focus; do not rebuild a second state tree at a breakpoint.

Verify 390, 1099, and 1920 widths, intermediate resize, short viewport heights,
long labels, open menus, and panel overlap. Dialogs, popovers, and floating panels
fit the visual viewport, flip or constrain as needed, and scroll internally.
No action becomes unreachable after resize, zoom, or an on-screen keyboard.

## Elevation & Depth

Use registered surfaces, borders, shadows, and layer roles, with the interaction
ownership described in [UI_RULES](docs/UI_RULES.md). Canvas-world content, screen
editors, menus, floating collection panels, overlays, and dialogs have different
stacking duties; arbitrary page-local z-index values are not a substitute.

Check clipping and actual pointer reachability when surfaces overlap. Escape
closes the top eligible layer and returns focus to a stable trigger. Modal focus
and covered/inert boundaries continue to protect the workspace. Outside-click
rules must not turn an internal drag into an accidental close.

## Shapes

Reuse registered capsule text actions, square rounded upload/IconButton targets,
and the distinct control, menu, panel, and card radius roles. Ordinary controls
use the shared 24/32/40 height axis and icons the shared 16/20/24 glyph axis;
explicit task-specific touch targets stay governed by their approved specification.
Use the registered spacing grid rather than page-local numeric substitutes.

Shape, height, padding, and icon slots stay consistent through all control states.
Loading placeholders preserve target geometry. Reduced motion respects the
registered motion contract and user preference; animation must not delay semantic
state or replace a real completion/connection receipt.

## Components

Reuse [shared component contracts](docs/DESIGN-SYSTEM.md),
[SettingsControls](src/components/settings/SettingsControls.tsx),
[ComposerTextarea](src/components/ComposerTextarea.tsx), and existing dismissible
layers. Preserve IME, growing inputs, voice/permission/send grouping, attachments,
draft identity, credentials, provider identity, stored keys, and legacy links.

The approved model picker has three rows: channel (relay API, account login,
official API, local), search/filter, then model selection. Do not reintroduce a
provider drilldown. Card selection is single; main Agent is single with Codex as
the default, and chat model access follows its explicit authorization. Parameters
belong to the actual execution model and operation, appear only when supported,
use recommended defaults, and retain each model's draft on switching. See MODEL
in the [approved specification](docs/changes/2026-10-15-kk-unified/spec.md);
these requirements do not imply the corresponding product implementation is done.

Every visible control performs a real action or explains why it is unavailable.
Generation paths share [uiGovernance](src/domain/uiGovernance.ts) predicates.
Empty, loading, error, offline, cancellation, recovery, disabled, and selected
states remain legible and actionable. Asynchronous feedback follows real
persistence/runtime confirmation; never show saved, connected, or completed from
a click alone. Failure preserves drafts and recovery paths; unknown acceptance
must not silently resubmit a task or switch execution channels.

All controls support pointer and keyboard operation, complete accessible names,
correct pressed/checked/expanded/selected semantics, restrained visible keyboard
focus, and a readable disabled reason. Check default, hover, active, selected,
disabled, and focus for buttons, inputs, switches, tabs, cards, menus, and navigation.
For dialogs/popovers also check Escape, focus containment/return, scrolling,
visual viewport changes, and overlapping surfaces. Full interaction rules remain
in [UI_RULES](docs/UI_RULES.md), avoiding a second behavior authority here.

## Do's and Don'ts

- Read current user requirements, the canonical topic, and shared callers first.
- Change numeric values only in tokens.css, then sync, check, lint, and review.
- Use the isolated [design preview workflow](docs/UI_SPEC.md#designmd-与独立预览) to inspect shared roles without reading or writing product storage.
- Verify themes, accents, density, long text, all control states, keyboard paths, and resizing.
- Preserve user/project/configuration identity and actual asynchronous feedback.
- Do not hand-edit generated roles, weaken checks, or create a preview-only palette.
- Do not turn external references, fixtures, static files, or passing builds into product acceptance.
- Do not infer REAL capability, native Mobile completion, or provider generation from this tool.

Acceptance still requires the actual source and loaded bundle, route/import chain,
same-state DOM and screenshots, and applicable Desktop/Web behavior under
[UI_SPEC](docs/UI_SPEC.md). Full-page UI optimization, real provider execution,
Desktop artifacts, hosted checks, and user acceptance need their own evidence.
