import { createServer } from 'node:http';
import { createApp } from './app';
import { createDependencies } from './bootstrap/create-dependencies';
import { backendOptionsSchema } from './config/backend-options';
import type { BackendOptionsInput } from './config/backend-options';

export async function startBackend(input: BackendOptionsInput) {
  const options = backendOptionsSchema.parse(input);
  const resources = await createDependencies(options);
  const server = createServer(createApp(resources.dependencies, options));
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(options.port, options.host, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  } catch (error) {
    await resources.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    await resources.close();
    throw new Error('Missing API address');
  }
  const host = address.address.includes(':')
    ? `[${address.address}]`
    : address.address;
  let closing: Promise<void> | undefined;
  return {
    url: `http://${host}:${address.port}`,
    close(): Promise<void> {
      return (closing ??= (async () => {
        // Let active requests finish, then bound shutdown even for a stalled client.
        const timeout = setTimeout(() => server.closeAllConnections(), 10_000);
        timeout.unref();
        try {
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
        } finally {
          clearTimeout(timeout);
          await resources.close();
        }
      })());
    },
  };
}
export type RunningBackend = Awaited<ReturnType<typeof startBackend>>;
