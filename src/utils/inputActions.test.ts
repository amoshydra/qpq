import type { Key } from 'ink';
import { describe, expect, it } from 'vitest';
import {
  getDeleteConfirmationAction,
  getFormNavigationAction,
  getHistoryAction,
  getMenuAction,
  getSearchAction,
} from './inputActions.js';

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  };
}

describe('getMenuAction', () => {
  it('handles navigation and selection keys', () => {
    expect(getMenuAction('', makeKey({ upArrow: true }))).toEqual({ type: 'move', delta: -1 });
    expect(getMenuAction('', makeKey({ downArrow: true }))).toEqual({ type: 'move', delta: 1 });
    expect(getMenuAction('\r', makeKey({ return: true }))).toEqual({ type: 'select' });
    expect(getMenuAction('\n', makeKey())).toEqual({ type: 'select' });
    expect(getMenuAction('1', makeKey())).toEqual({ type: 'select-index', index: 0 });
    expect(getMenuAction('9', makeKey())).toEqual({ type: 'select-index', index: 8 });
  });

  it('handles menu shortcuts', () => {
    expect(getMenuAction('f', makeKey())).toEqual({ type: 'toggle-favorite' });
    expect(getMenuAction('d', makeKey())).toEqual({ type: 'delete' });
    expect(getMenuAction('e', makeKey())).toEqual({ type: 'edit' });
    expect(getMenuAction('c', makeKey())).toEqual({ type: 'duplicate' });
    expect(getMenuAction('a', makeKey())).toEqual({ type: 'add' });
    expect(getMenuAction('/', makeKey())).toEqual({ type: 'switch-to-search' });
  });

  it('quits on Escape and Ctrl+C', () => {
    expect(getMenuAction('', makeKey({ escape: true }))).toEqual({ type: 'quit' });
    expect(getMenuAction('c', makeKey({ ctrl: true }))).toEqual({ type: 'quit' });
  });

  it('ignores Ctrl shortcuts, including Ctrl+D', () => {
    expect(getMenuAction('d', makeKey({ ctrl: true }))).toBeNull();
    expect(getMenuAction('f', makeKey({ ctrl: true }))).toBeNull();
    expect(getMenuAction('a', makeKey({ ctrl: true }))).toBeNull();
    expect(getMenuAction('1', makeKey({ ctrl: true }))).toBeNull();
    expect(getMenuAction('', makeKey({ upArrow: true, ctrl: true }))).toBeNull();
  });

  it('ignores unhandled keys', () => {
    expect(getMenuAction('x', makeKey())).toBeNull();
    expect(getMenuAction('', makeKey())).toBeNull();
  });
});

describe('getSearchAction', () => {
  it('appends typed text, including digits', () => {
    expect(getSearchAction('3', makeKey())).toEqual({ type: 'append', value: '3' });
    expect(getSearchAction('3000', makeKey())).toEqual({ type: 'append', value: '3000' });
    expect(getSearchAction('x', makeKey())).toEqual({ type: 'append', value: 'x' });
  });

  it('selects on Return or linefeed', () => {
    expect(getSearchAction('\r', makeKey({ return: true }))).toEqual({ type: 'select' });
    expect(getSearchAction('\n', makeKey())).toEqual({ type: 'select' });
  });

  it('handles escape, arrows, and backspace', () => {
    expect(getSearchAction('', makeKey({ escape: true }))).toEqual({ type: 'back-to-menu' });
    expect(getSearchAction('', makeKey({ upArrow: true }))).toEqual({ type: 'move', delta: -1 });
    expect(getSearchAction('', makeKey({ downArrow: true }))).toEqual({ type: 'move', delta: 1 });
    expect(getSearchAction('', makeKey({ backspace: true }))).toEqual({ type: 'backspace' });
  });

  it('ignores Ctrl shortcuts and the Delete key', () => {
    expect(getSearchAction('d', makeKey({ ctrl: true }))).toBeNull();
    expect(getSearchAction('v', makeKey({ ctrl: true }))).toBeNull();
    expect(getSearchAction('', makeKey({ delete: true }))).toBeNull();
  });
});

describe('getFormNavigationAction', () => {
  it('moves between fields and submits on the last field', () => {
    expect(getFormNavigationAction('\r', makeKey({ return: true }), false)).toBe('next');
    expect(getFormNavigationAction('\r', makeKey({ return: true }), true)).toBe('submit');
    expect(getFormNavigationAction('\n', makeKey(), false)).toBe('next');
    expect(getFormNavigationAction('\n', makeKey(), true)).toBe('submit');
  });

  it('handles arrows and Escape', () => {
    expect(getFormNavigationAction('', makeKey({ upArrow: true }), false)).toBe('previous');
    expect(getFormNavigationAction('', makeKey({ downArrow: true }), false)).toBe('next');
    expect(getFormNavigationAction('', makeKey({ escape: true }), false)).toBe('cancel');
  });

  it('ignores Ctrl+D and unhandled keys', () => {
    expect(getFormNavigationAction('d', makeKey({ ctrl: true }), false)).toBeNull();
    expect(getFormNavigationAction('x', makeKey(), false)).toBeNull();
  });
});

describe('getHistoryAction', () => {
  it('handles new-command, selection, navigation, and cancellation', () => {
    expect(getHistoryAction('n', makeKey())).toBe('new');
    expect(getHistoryAction('\r', makeKey({ return: true }))).toBe('select');
    expect(getHistoryAction('\n', makeKey())).toBe('select');
    expect(getHistoryAction('', makeKey({ upArrow: true }))).toBe('previous');
    expect(getHistoryAction('', makeKey({ downArrow: true }))).toBe('next');
    expect(getHistoryAction('', makeKey({ escape: true }))).toBe('cancel');
  });

  it('ignores Ctrl shortcuts, including Ctrl+N', () => {
    expect(getHistoryAction('n', makeKey({ ctrl: true }))).toBeNull();
    expect(getHistoryAction('d', makeKey({ ctrl: true }))).toBeNull();
  });
});

describe('getDeleteConfirmationAction', () => {
  it('confirms with y, Y, Return, or linefeed', () => {
    expect(getDeleteConfirmationAction('y', makeKey(), false)).toBe('confirm');
    expect(getDeleteConfirmationAction('Y', makeKey(), false)).toBe('confirm');
    expect(getDeleteConfirmationAction('\r', makeKey({ return: true }), false)).toBe('confirm');
    expect(getDeleteConfirmationAction('\n', makeKey(), false)).toBe('confirm');
  });

  it('cancels with n, N, or Escape', () => {
    expect(getDeleteConfirmationAction('n', makeKey(), false)).toBe('cancel');
    expect(getDeleteConfirmationAction('N', makeKey(), false)).toBe('cancel');
    expect(getDeleteConfirmationAction('', makeKey({ escape: true }), false)).toBe('cancel');
  });

  it('ignores actions while deleting', () => {
    expect(getDeleteConfirmationAction('y', makeKey(), true)).toBeNull();
    expect(getDeleteConfirmationAction('', makeKey({ escape: true }), true)).toBeNull();
  });

  it('ignores Ctrl shortcuts', () => {
    expect(getDeleteConfirmationAction('y', makeKey({ ctrl: true }), false)).toBeNull();
    expect(getDeleteConfirmationAction('n', makeKey({ ctrl: true }), false)).toBeNull();
    expect(getDeleteConfirmationAction('d', makeKey({ ctrl: true }), false)).toBeNull();
  });
});
