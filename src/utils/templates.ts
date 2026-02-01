const PLACEHOLDER_REGEX = /\{(\w+)\}/g;

export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];
  let match;
  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    placeholders.push(match[1]);
  }
  return [...new Set(placeholders)];
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(PLACEHOLDER_REGEX, (_, key) => values[key] || `{${key}}`);
}