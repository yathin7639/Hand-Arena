export function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export function sanitizeString(val: unknown, maxLength: number = 200): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLength);
}

export function isNumberInRange(val: unknown, min: number, max: number): val is number {
  return typeof val === "number" && !isNaN(val) && val >= min && val <= max;
}
