import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEnvironment } from './config/environment';
import { startBackend } from './server';
import { installShutdownHandlers } from './bootstrap/shutdown';

// src/main.ts and dist/main.js have the same depth in the workspace.
async function main() {
  const workspaceRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../..',
  );
  const config = readEnvironment(process.env, workspaceRoot);
  if (config.dataDirectory)
    await mkdir(config.dataDirectory, { recursive: true });
  const api = await startBackend(config.options);
  installShutdownHandlers(api);
  console.log(`ASKOD API: ${api.url}`);
}
void main().catch((error) => {
  console.error(
    'API startup failed',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exitCode = 1;
});
