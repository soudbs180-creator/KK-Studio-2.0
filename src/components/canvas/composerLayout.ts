/** The composer mount signal lets canvas reveal wait for its first layout pass. */
export const COMPOSER_MOUNT_SIGNAL_HEIGHT = 60;

export function composerReportedHeight(measuredHeight: number): number {
  return Math.max(0, measuredHeight - 156) + COMPOSER_MOUNT_SIGNAL_HEIGHT;
}

export function visibleComposerExtraHeight(reportedHeight: number): number {
  return Math.max(0, reportedHeight - COMPOSER_MOUNT_SIGNAL_HEIGHT);
}
