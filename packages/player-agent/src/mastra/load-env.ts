import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseEnv } from 'node:util';

const loadedEnvFiles = new Set<string>();

function ancestorsFrom(directory: string): string[] {
  const ancestors: string[] = [];
  let current = directory;

  while (true) {
    ancestors.push(current);
    const parent = dirname(current);
    if (parent === current) return ancestors;
    current = parent;
  }
}

export function loadLocalEnvFiles(startDirectory = process.cwd()) {
  const envFiles = ancestorsFrom(startDirectory)
    .reverse()
    .map((directory) => join(directory, '.env'));

  for (const envFile of envFiles) {
    if (loadedEnvFiles.has(envFile) || !existsSync(envFile)) continue;

    loadedEnvFiles.add(envFile);
    const parsedEnv = parseEnv(readFileSync(envFile, 'utf8'));

    for (const [key, value] of Object.entries(parsedEnv)) {
      if (process.env[key] === undefined || process.env[key]?.trim() === '') {
        process.env[key] = value;
      }
    }
  }
}
