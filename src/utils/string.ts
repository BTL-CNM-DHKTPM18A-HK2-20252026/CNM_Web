export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function safeTrim(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
