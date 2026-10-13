/** The composer mount signal lets canvas reveal wait for its first layout pass. */
export const COMPOSER_MOUNT_SIGNAL_HEIGHT = 60;

export function composerReportedHeight(
  expanded: boolean,
  error?: string,
): number {
  return (expanded ? 93 : 0) + (error ? 80 : 0) + COMPOSER_MOUNT_SIGNAL_HEIGHT;
}

export function visibleComposerExtraHeight(reportedHeight: number): number {
  return Math.max(0, reportedHeight - COMPOSER_MOUNT_SIGNAL_HEIGHT);
}
