/** Initial and post-load focus must skip hidden navigation and disabled controls. */
export function focusDialogControl(dialog: Element | null | undefined): void {
  const target = [
    ...(dialog?.querySelectorAll<HTMLElement>(
      "[data-initial-focus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    ) ?? []),
  ].find(
    (element) =>
      element.getClientRects().length &&
      !element.matches(":disabled") &&
      !element.closest("[inert]") &&
      getComputedStyle(element).visibility !== "hidden",
  );
  if (target) target.focus({ preventScroll: true });
  else if (dialog instanceof HTMLElement) dialog.focus({ preventScroll: true });
}
