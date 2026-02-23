import { nanoid } from "nanoid";

export function generateCode(length = 7): string {
  return nanoid(length);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
