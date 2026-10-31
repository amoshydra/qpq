import type { Key } from 'ink';

function isEnter(input: string, key: Key): boolean {
  return key.return || input === '\n';
}

export type MenuAction =
  | { type: 'quit' }
  | { type: 'switch-to-search' }
  | { type: 'add' }
  | { type: 'move'; delta: -1 | 1 }
  | { type: 'select' }
  | { type: 'select-index'; index: number }
  | { type: 'toggle-favorite' }
  | { type: 'delete' }
  | { type: 'edit' }
  | { type: 'duplicate' };

export function getMenuAction(input: string, key: Key): MenuAction | null {
  if (key.escape || (key.ctrl && input === 'c') || input === '\x03') {
    return { type: 'quit' };
  }

  if (key.ctrl) {
    return null;
  }

  if (key.upArrow) {
    return { type: 'move', delta: -1 };
  }

  if (key.downArrow) {
    return { type: 'move', delta: 1 };
  }

  if (input === '/') {
    return { type: 'switch-to-search' };
  }

  if (input === 'a') {
    return { type: 'add' };
  }

  if (isEnter(input, key)) {
    return { type: 'select' };
  }

  if (/^[1-9]$/.test(input)) {
    return { type: 'select-index', index: Number.parseInt(input, 10) - 1 };
  }

  if (input === 'f') {
    return { type: 'toggle-favorite' };
  }

  if (input === 'd') {
    return { type: 'delete' };
  }

  if (input === 'e') {
    return { type: 'edit' };
  }

  if (input === 'c') {
    return { type: 'duplicate' };
  }

  return null;
}

export type SearchAction =
  | { type: 'quit' }
  | { type: 'select' }
  | { type: 'back-to-menu' }
  | { type: 'move'; delta: -1 | 1 }
  | { type: 'backspace' }
  | { type: 'append'; value: string };

export function getSearchAction(input: string, key: Key): SearchAction | null {
  if (key.ctrl && input === 'c') {
    return { type: 'quit' };
  }

  if (key.ctrl) {
    return null;
  }

  if (isEnter(input, key)) {
    return { type: 'select' };
  }

  if (key.escape) {
    return { type: 'back-to-menu' };
  }

  if (key.upArrow) {
    return { type: 'move', delta: -1 };
  }

  if (key.downArrow) {
    return { type: 'move', delta: 1 };
  }

  if (key.backspace) {
    return { type: 'backspace' };
  }

  if (input) {
    return { type: 'append', value: input };
  }

  return null;
}

export type FormNavigationAction = 'cancel' | 'previous' | 'next' | 'submit';

export function getFormNavigationAction(
  input: string,
  key: Key,
  isLastField: boolean,
): FormNavigationAction | null {
  if (key.escape) {
    return 'cancel';
  }

  if (key.upArrow) {
    return 'previous';
  }

  if (key.downArrow) {
    return 'next';
  }

  if (isEnter(input, key)) {
    return isLastField ? 'submit' : 'next';
  }

  return null;
}

export type HistoryAction = 'cancel' | 'new' | 'select' | 'previous' | 'next';

export function getHistoryAction(input: string, key: Key): HistoryAction | null {
  if (key.escape) {
    return 'cancel';
  }

  if (key.ctrl) {
    return null;
  }

  if (input === 'n') {
    return 'new';
  }

  if (isEnter(input, key)) {
    return 'select';
  }

  if (key.upArrow) {
    return 'previous';
  }

  if (key.downArrow) {
    return 'next';
  }

  return null;
}

export type DeleteConfirmationAction = 'cancel' | 'confirm';

export function getDeleteConfirmationAction(
  input: string,
  key: Key,
  isDeleting: boolean,
): DeleteConfirmationAction | null {
  if (isDeleting) {
    return null;
  }

  if (key.escape) {
    return 'cancel';
  }

  if (key.ctrl) {
    return null;
  }

  if (isEnter(input, key) || input === 'y' || input === 'Y') {
    return 'confirm';
  }

  if (input === 'n' || input === 'N') {
    return 'cancel';
  }

  return null;
}
