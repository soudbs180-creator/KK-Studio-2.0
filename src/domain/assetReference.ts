const PREFIX = "kk-asset:";
const ID = /^asset-[a-f0-9]{24}$/;
export function isAssetReference(value: string): boolean {
  return value.startsWith(PREFIX) && ID.test(value.slice(PREFIX.length));
}
