import React from 'react';
import { renderToString as reactRenderToString } from 'react-dom/server';
import { render } from 'ink';
import type { ReactElement } from 'react';

function createMockStdout() {
  let output = '';
  return {
    write: (str: string) => {
      output += str;
    },
    columns: 80,
    isTTY: true,
    on: () => {},
    once: () => {},
    emit: () => false,
    addListener: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    setMaxListeners: () => {},
    getMaxListeners: () => 0,
    listeners: () => [],
    rawListeners: () => [],
    listenerCount: () => 0,
    eventNames: () => [],
    end: () => {},
    destroy: () => {},
    getWritten: () => output,
  };
}

export function renderToString(element: ReactElement): string {
  const stdout = createMockStdout();
  const unmount = render(element, { stdout: stdout as any, debug: false }).unmount;
  unmount();
  return stdout.getWritten();
}

export async function renderToStringAsync(element: ReactElement): Promise<string> {
  const stdout = createMockStdout();
  const instance = render(element, { stdout: stdout as any, debug: false });
  await instance.waitUntilExit();
  return stdout.getWritten();
}
