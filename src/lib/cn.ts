export type ClassValue = string | undefined | null | false | (string | undefined | null | false)[];

export function cn(...inputs: ClassValue[]): string {
  const result: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      result.push(input);
    } else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string' && item.length > 0) {
          result.push(item);
        }
      }
    }
  }
  return result.join(' ');
}
