/**
 * A lookup the build depends on. If it finds nothing, fail the build and say
 * what was missing, instead of passing `undefined` along.
 */
export function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`);
  return value;
}
