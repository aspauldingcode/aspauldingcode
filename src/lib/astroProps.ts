/** Astro island `props` attribute revival. Same encoding as astro-island. */

const propTypes: Record<number, (value: unknown) => unknown> = {
  0: (value) => reviveObject(value),
  1: (value) => reviveArray(value),
  2: (value) => new RegExp(value as string),
  3: (value) => new Date(value as string),
  4: (value) => new Map(reviveArray(value)),
  5: (value) => new Set(reviveArray(value)),
  6: (value) => BigInt(value as string | number),
  7: (value) => new URL(value as string),
  8: (value) => new Uint8Array(value as number[]),
  9: (value) => new Uint16Array(value as number[]),
  10: (value) => new Uint32Array(value as number[]),
  11: (value) => Infinity * Number(value),
};

function reviveTuple(raw: unknown): unknown {
  if (!Array.isArray(raw) || raw.length < 2) return undefined;
  const [type, value] = raw;
  return type in propTypes ? propTypes[type as number](value) : undefined;
}

function reviveArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw.map(reviveTuple) : [];
}

function reviveObject(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, reviveTuple(value)])
  );
}

export function reviveAstroProps(raw: string): Record<string, unknown> {
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  const revived = reviveObject(parsed);
  return typeof revived === 'object' && revived !== null
    ? (revived as Record<string, unknown>)
    : {};
}
