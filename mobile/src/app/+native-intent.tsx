import {
  getNativeLinkOwnership,
  safeNativePath,
} from "../application/nativeLinks.ts";
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  return safeNativePath(path, getNativeLinkOwnership(), __DEV__);
}
