/** Match the portable Rust schema; never drop unknown editing metadata. */
export function assertEditShape(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
  message: string,
): void {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key)) ||
    required.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error(message);
}
