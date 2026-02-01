import * as os from 'os';
import * as path from 'path';

export function getConfigDir(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32':
      return path.join(homeDir, 'AppData', 'Local', 'qpq');

    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'qpq');

    default:
      return path.join(homeDir, '.local', 'state', 'qpq');
  }
}