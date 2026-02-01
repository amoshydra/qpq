 import * as fs from 'fs';
 import * as path from 'path';
 import type { Command } from '../types/command.js';
 import { getConfigDir } from './configDir.js';

 const FAVORITES_FILE = path.join(getConfigDir(), 'favorites.json');
 const MAX_FAVORITES = 20;

 interface FavoritesData {
   favNames: string[];
 }

async function ensureDir(): Promise<void> {
  const dir = getConfigDir();
  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

export async function loadFavorites(): Promise<string[]> {
  try {
    const content = await fs.promises.readFile(FAVORITES_FILE, 'utf-8');
    const data: FavoritesData = JSON.parse(content);
    return data.favNames || [];
  } catch {
    return [];
  }
}

export async function saveFavorites(favNames: string[]): Promise<void> {
  await ensureDir();
  const data: FavoritesData = { favNames: favNames.slice(0, MAX_FAVORITES) };
  await fs.promises.writeFile(FAVORITES_FILE, JSON.stringify(data, null, 2));
}

export async function toggleFavorite(commandName: string): Promise<string[]> {
  const current = await loadFavorites();
  const index = current.indexOf(commandName);

  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(commandName);
  }

  await saveFavorites(current);
  return current;
}

export function isFavorite(commandName: string, favorites: string[]): boolean {
  return favorites.includes(commandName);
}

export async function clearFavorites(): Promise<void> {
  try {
    await fs.promises.unlink(FAVORITES_FILE);
  } catch {
  }
}