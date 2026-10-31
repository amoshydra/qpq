import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AddCommandForm } from '../components/AddCommandForm.js';
import { CommandForm } from '../components/CommandForm.js';
import { CommandMenu } from '../components/CommandMenu.js';
import { CommandSearch } from '../components/CommandSearch.js';
import { DeleteConfirmation } from '../components/DeleteConfirmation.js';
import { ErrorScreen } from '../components/ErrorScreen.js';
import { TemplatePrompt } from '../components/TemplatePrompt.js';
import type { Command } from '../types/command.js';
import { renderForTest } from './ink.js';

vi.mock('../utils/shellHistory.js', () => ({
  getLastCommands: vi.fn(async () => ['echo one', 'echo two']),
}));

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
      <DeleteConfirmation command={alpha} onConfirm={onConfirm} onCancel={() => {}} />,
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

describe('AddCommandForm', () => {
  it('selects the first shell history entry and submits it as a command', async () => {
    const onSubmit = vi.fn();
    const app = await renderForTest(
      <AddCommandForm existingCommands={[]} onSubmit={onSubmit} onCancel={() => {}} />,
    );

    try {
      await vi.waitFor(() => {
        expect(app.text()).toContain('echo one');
      });

      await app.send('\r');

      await vi.waitFor(() => {
        expect(app.text()).toContain('Add New Command');
      });

      for (let index = 0; index < 4; index += 1) {
        await app.send('\r');
      }

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'echo one', command: 'echo one' }),
      );
    } finally {
      app.unmount();
    }
  });
});

describe('TemplatePrompt', () => {
  it('collects placeholders in order and submits their values', async () => {
    const onSubmit = vi.fn();
    const app = await renderForTest(
      <TemplatePrompt
        placeholders={[
          { name: 'host', sortIndex: 0 },
          { name: 'port', sortIndex: 0 },
        ]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    try {
      for (const character of 'localhost') {
        await app.send(character);
      }

      await app.send('\r');

      for (const character of '8080') {
        await app.send(character);
      }

      await app.send('\r');

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ host: 'localhost', port: '8080' });
    } finally {
      app.unmount();
    }
  });
});

describe('ErrorScreen', () => {
  it('dismisses recoverable errors with Escape', async () => {
    const onDismiss = vi.fn();
    const app = await renderForTest(
      <ErrorScreen error={{ message: 'Save failed', recoverable: true }} onDismiss={onDismiss} />,
    );

    try {
      await app.send('\x1B');

      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      app.unmount();
    }
  });

  it('does not dismiss fatal errors', async () => {
    const onDismiss = vi.fn();
    const app = await renderForTest(
      <ErrorScreen
        error={{ message: 'Config corrupt', recoverable: false }}
        onDismiss={onDismiss}
      />,
    );

    try {
      await app.send('\x1B');
      await app.send('\r');

      expect(onDismiss).not.toHaveBeenCalled();
      expect(app.text()).toContain('Press Ctrl+C to quit.');
    } finally {
      app.unmount();
    }
  });
});
