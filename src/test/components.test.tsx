import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommandForm } from '../components/CommandForm.js';
import { CommandMenu } from '../components/CommandMenu.js';
import { CommandSearch } from '../components/CommandSearch.js';
import { DeleteConfirmation } from '../components/DeleteConfirmation.js';
import type { Command } from '../types/command.js';
import { renderForTest } from './ink.js';

const alpha: Command = { id: 1, name: 'Alpha', command: 'echo alpha' };
const beta: Command = { id: 2, name: 'Beta', command: 'echo beta' };

function FavoriteHarness({ onSelect }: { onSelect: (command: Command) => void }) {
  const [favorites, setFavorites] = useState<number[]>([]);

  return (
    <CommandMenu
      commands={[alpha, beta]}
      commandTimestamps={new Map()}
      favorites={favorites}
      onSelect={onSelect}
      onSwitchToSearch={() => {}}
      onToggleFavorite={(commandId) => setFavorites([commandId])}
      onAdd={() => {}}
      onDelete={() => {}}
      onEdit={() => {}}
      onDuplicate={() => {}}
    />
  );
}

describe('CommandMenu', () => {
  it('keeps the selected command after a favorite toggle reorders the list', async () => {
    const onSelect = vi.fn();
    const app = await renderForTest(<FavoriteHarness onSelect={onSelect} />);

    try {
      await app.send('\x1B[B');
      await app.send('f');
      await app.send('\r');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    } finally {
      app.unmount();
    }
  });

  it('does not treat Ctrl+D as the delete shortcut', async () => {
    const onDelete = vi.fn();
    const app = await renderForTest(
      <CommandMenu
        commands={[alpha]}
        commandTimestamps={new Map()}
        favorites={[]}
        onSelect={() => {}}
        onSwitchToSearch={() => {}}
        onToggleFavorite={() => {}}
        onAdd={() => {}}
        onDelete={onDelete}
        onEdit={() => {}}
        onDuplicate={() => {}}
      />,
    );

    try {
      await app.send('\x04');
      expect(onDelete).not.toHaveBeenCalled();

      await app.send('d');
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(1);
    } finally {
      app.unmount();
    }
  });
});

describe('CommandSearch', () => {
  it('keeps digits in the query and selects the matching result', async () => {
    const onSelect = vi.fn();
    const commands: Command[] = [
      { id: 1, name: 'Port', command: 'echo found-3000' },
      { id: 2, name: 'Other', command: 'echo nope' },
    ];
    const app = await renderForTest(
      <CommandSearch
        allCommands={commands}
        recentCommands={[]}
        favorites={[]}
        onSelect={onSelect}
        onSwitchToMenu={() => {}}
      />,
    );

    try {
      for (const digit of ['3', '0', '0', '0']) {
        await app.send(digit);
      }

      expect(app.text()).toContain('3000');

      await app.send('\r');

      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    } finally {
      app.unmount();
    }
  });
});

describe('CommandForm', () => {
  it('shows a validation error for a duplicate name without submitting', async () => {
    const onSubmit = vi.fn();
    const app = await renderForTest(
      <CommandForm
        initialValues={{ name: 'Alpha', command: 'echo alpha' }}
        existingCommands={[alpha, beta]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    try {
      for (let index = 0; index < 4; index += 1) {
        await app.send('\r');
      }

      expect(onSubmit).not.toHaveBeenCalled();
      expect(app.text()).toContain('A command named "Alpha" already exists.');
    } finally {
      app.unmount();
    }
  });

  it('does not submit twice when Enter is pressed repeatedly', async () => {
    const onSubmit = vi.fn();
    const app = await renderForTest(
      <CommandForm
        initialValues={{ name: 'Unique', command: 'echo unique' }}
        existingCommands={[]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    try {
      for (let index = 0; index < 5; index += 1) {
        await app.send('\r');
      }

      expect(onSubmit).toHaveBeenCalledTimes(1);
    } finally {
      app.unmount();
    }
  });
});

describe('DeleteConfirmation', () => {
  it('confirms only once even if Enter is pressed repeatedly', async () => {
    const onConfirm = vi.fn(async () => {});
    const app = await renderForTest(
      <DeleteConfirmation
        command={alpha}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    try {
      await app.send('y');
      await app.send('y');
      await app.send('\r');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    } finally {
      app.unmount();
    }
  });
});
