const MICROSTX_PER_STX = 1_000_000n;

export function parseStxToMicrostx(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,6})?$/.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  const micro =
    BigInt(whole) * MICROSTX_PER_STX + BigInt(paddedFraction || "0");

  return micro > 0n ? micro : null;
}

export function formatMicrostxToStx(value: bigint): string {
  const whole = value / MICROSTX_PER_STX;
  const fraction = value % MICROSTX_PER_STX;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionText}`;
}
