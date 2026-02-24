import { nanoid } from 'nanoid';

export function generateCode(length = 7): string {
  return nanoid(length);
}

export function isValidUrl(url: string): boolean {
  if (url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
