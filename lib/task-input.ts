export const TITLE_MAX = 200;

export function isValidTitle(raw: string): boolean {
  const length = raw.trim().length;
  return length >= 1 && length <= TITLE_MAX;
}

export function toDueDate(raw: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
