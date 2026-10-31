import type { Command } from '../types/command.js';

export interface CommandFormValues {
  name: string;
  command: string;
  description: string;
  tags: string;
}

export type CommandFormResult =
  { ok: true; command: Omit<Command, 'id'> } | { ok: false; error: string };

export function buildCommandFromForm(
  values: CommandFormValues,
  existingCommands: Command[],
  editingCommandId?: number,
): CommandFormResult {
  const command = values.command.trim();

  if (!command) {
    return { ok: false, error: 'Command is required.' };
  }

  const name = values.name.trim() || command;
  const duplicate = existingCommands.find(
    (existing) =>
      existing.id !== editingCommandId && existing.name.trim().toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    return { ok: false, error: `A command named "${name}" already exists.` };
  }

  const tags = [
    ...new Set(
      values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
  const description = values.description.trim();

  return {
    ok: true,
    command: {
      name,
      command,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
    },
  };
}
