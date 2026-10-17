export interface ActionTheme {
  background: string;
  pageSurface: string;
  text: string;
  border: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  onAccent: string;
  selected: string;
  danger: string;
}
export function actionAppearance(
  theme: ActionTheme,
  state: {
    primary?: boolean;
    selected?: boolean;
    pressed?: boolean;
    danger?: boolean;
    quiet?: boolean;
  },
) {
  return {
    background: state.primary
      ? theme.text
      : state.selected || state.pressed
        ? theme.selected
        : state.quiet
          ? "transparent"
          : theme.pageSurface,
    foreground: state.primary
      ? theme.background
      : state.danger
        ? theme.danger
        : theme.text,
    border: theme.border,
    marker: theme.accent,
  };
}
