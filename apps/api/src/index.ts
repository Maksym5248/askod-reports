import { GetWorkspaceStatus } from '@askod/application';
import { connectDatabase } from '@askod/infrastructure';
import { createApp } from './app';

export async function startApi(options: {
  databaseUrl: string;
  schemaPath: string;
  port?: number;
  token?: string;
  allowedOrigin?: string;
}) {
  const database = await connectDatabase(
    options.databaseUrl,
    options.schemaPath,
  );
  const app = createApp(new GetWorkspaceStatus(database.documents), options);
  const server = app.listen(options.port ?? 0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  } catch (error) {
    await database.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing API address');
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.close();
    },
  };
}
