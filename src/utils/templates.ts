const PLACEHOLDER_REGEX = /\{(\w+)(?::(\d+))?\}/g;

export interface PlaceholderInfo {
  name: string;
  sortIndex: number;
}

export function extractPlaceholders(template: string): PlaceholderInfo[] {
  const placeholders: PlaceholderInfo[] = [];
  let match;
  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    const name = match[1];
    const sortIndex = match[2] ? parseInt(match[2], 10) : 0;
    const existing = placeholders.find(p => p.name === name);
    if (!existing) {
      placeholders.push({ name, sortIndex });
    }
  }

  return placeholders.sort((a, b) => {
    if (a.sortIndex !== b.sortIndex) {
      return a.sortIndex - b.sortIndex;
    }
    const posA = template.indexOf(`{${a.name}`);
    const posB = template.indexOf(`{${b.name}`);
    return posA - posB;
  });
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)(?::\d+)?\}/g, (_, key) => values[key] === undefined ? `{${key}}` : values[key]);
}