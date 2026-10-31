import { EventEmitter } from 'node:events';
import { render } from 'ink';
import type { ReactElement } from 'react';

class FakeStdin extends EventEmitter {
  readonly isTTY = true;
  private readonly chunks: string[] = [];

  setRawMode(): void {}

  ref(): void {}

  unref(): void {}

  setEncoding(): void {}

  read(): string | null {
    return this.chunks.shift() ?? null;
  }

  send(input: string): void {
    this.chunks.push(input);
    this.emit('readable');
  }
}

class FakeStdout extends EventEmitter {
  readonly isTTY = true;
  readonly columns = 120;
  readonly rows = 30;
  output = '';

  write(data: string): boolean {
    this.output += data;
    return true;
  }
}

export function stripAnsi(value: string): string {
  return value
    .replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)/g, '')
    .replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '');
}

const tick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

export async function renderForTest(element: ReactElement) {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout();
  const instance = render(element, {
    stdin: stdin as unknown as NodeJS.ReadStream,
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: stdout as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  await tick();
  await tick();

  return {
    stdin,
    stdout,
    instance,
    text: () => stripAnsi(stdout.output),
    clearOutput(): void {
      stdout.output = '';
    },
    async send(input: string): Promise<void> {
      stdin.send(input);
      await tick();
      await tick();
    },
    async rerender(nextElement: ReactElement): Promise<void> {
      instance.rerender(nextElement);
      await tick();
      await tick();
    },
    unmount(): void {
      instance.unmount();
    },
  };
}
