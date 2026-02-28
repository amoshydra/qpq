import { describe, expect, it } from 'vitest';
import { extractPlaceholders, fillTemplate } from './templates.js';

describe('extractPlaceholders', () => {
  it('should extract basic placeholders without sort index', () => {
    const result = extractPlaceholders('adb pair {ip}; adb connect {host}');
    expect(result).toEqual([
      { name: 'ip', sortIndex: 0 },
      { name: 'host', sortIndex: 0 },
    ]);
  });

  it('should sort by sortIndex ascending', () => {
    const result = extractPlaceholders('adb pair {ip:3}{port:2}; adb connect {host:1}');
    expect(result).toEqual([
      { name: 'host', sortIndex: 1 },
      { name: 'port', sortIndex: 2 },
      { name: 'ip', sortIndex: 3 },
    ]);
  });

  it('should use position as tiebreaker when sortIndex is same', () => {
    const result = extractPlaceholders('{z}{a}{m}');
    expect(result).toEqual([
      { name: 'z', sortIndex: 0 },
      { name: 'a', sortIndex: 0 },
      { name: 'm', sortIndex: 0 },
    ]);
  });

  it('should combine sortIndex and position tiebreaker', () => {
    const result = extractPlaceholders('{z:1}{a:2}{m:1}');
    expect(result).toEqual([
      { name: 'z', sortIndex: 1 },
      { name: 'm', sortIndex: 1 },
      { name: 'a', sortIndex: 2 },
    ]);
  });

  it('should handle mixed placeholders with and without sort index', () => {
    const result = extractPlaceholders('{ip:3}{port}{host:1}');
    expect(result).toEqual([
      { name: 'port', sortIndex: 0 },
      { name: 'host', sortIndex: 1 },
      { name: 'ip', sortIndex: 3 },
    ]);
  });

  it('should return empty array for template without placeholders', () => {
    const result = extractPlaceholders('git status');
    expect(result).toEqual([]);
  });

  it('should deduplicate repeated placeholders', () => {
    const result = extractPlaceholders('{host}:{port} {host}');
    expect(result).toEqual([
      { name: 'host', sortIndex: 0 },
      { name: 'port', sortIndex: 0 },
    ]);
  });

  it('should handle placeholder at start and end of template', () => {
    const result = extractPlaceholders('{first} middle {last:2}');
    expect(result).toEqual([
      { name: 'first', sortIndex: 0 },
      { name: 'last', sortIndex: 2 },
    ]);
  });
});

describe('fillTemplate', () => {
  it('should replace placeholders with values', () => {
    const result = fillTemplate('adb connect {host}:{port}', { host: '192.168.1.1', port: '5555' });
    expect(result).toBe('adb connect 192.168.1.1:5555');
  });

  it('should keep placeholder if value is undefined', () => {
    const result = fillTemplate('adb connect {host}:{port}', { host: '192.168.1.1' });
    expect(result).toBe('adb connect 192.168.1.1:{port}');
  });

  it('should handle placeholders with sort index in template', () => {
    const result = fillTemplate('adb pair {ip:3}{port:2}; adb connect {host:1}', { ip: '192.168.1.1', port: '5555', host: 'localhost' });
    expect(result).toBe('adb pair 192.168.1.15555; adb connect localhost');
  });

  it('should handle empty values', () => {
    const result = fillTemplate('echo {msg}', { msg: '' });
    expect(result).toBe('echo ');
  });
});
