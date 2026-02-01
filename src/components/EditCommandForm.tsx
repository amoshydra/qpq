import type { Command } from '../types/command.js';
import { CommandForm } from './CommandForm.js';

interface EditCommandFormProps {
  command: Command;
  existingCommands: Command[];
  onSubmit: (command: Command) => void;
  onCancel: () => void;
}

export function EditCommandForm({ command, existingCommands, onSubmit, onCancel }: EditCommandFormProps) {
  return (
    <CommandForm
      initialValues={command}
      existingCommands={existingCommands}
      onSubmit={onSubmit}
      onCancel={onCancel}
      existingCommandName={command.name}
    />
  );
}
