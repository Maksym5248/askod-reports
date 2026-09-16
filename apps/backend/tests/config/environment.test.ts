import { describe, expect, it } from 'vitest';
import { readEnvironment } from '../../src/config/environment';
import { backendOptionsSchema } from '../../src/config/backend-options';
import { resolve } from 'node:path';

describe('API configuration', () => {
  it('has deterministic defaults independent of process cwd', () => {
    const config = readEnvironment({}, '/tmp/workspace');
    expect(config.options).toMatchObject({
      host: '127.0.0.1',
      port: 4310,
      databaseUrl: 'file:/tmp/workspace/.data/askod.db',
    });
    expect(config.options.schemaPath).toBe(
      resolve('/tmp/workspace/apps/backend/prisma/schema.prisma'),
    );
  });
  it('supports explicit server deployment configuration', () => {
    const config = readEnvironment(
      {
        HOST: '0.0.0.0',
        PORT: '8080',
        DATABASE_URL: 'file:/tmp/custom.db',
        PRISMA_SCHEMA_PATH: '/tmp/schema.prisma',
        API_TOKEN: 'token',
        ALLOWED_ORIGIN: 'https://example.com',
      },
      '/tmp/workspace',
    );
    expect(config.options).toMatchObject({
      host: '0.0.0.0',
      port: 8080,
      databaseUrl: 'file:/tmp/custom.db',
      schemaPath: '/tmp/schema.prisma',
      token: 'token',
    });
    expect(config.dataDirectory).toBeUndefined();
  });
  it('rejects invalid configuration and permits ephemeral ports only for embedded mode', () => {
    for (const env of [
      { PORT: 'invalid' },
      { PORT: '0' },
      { PORT: '70000' },
      { API_TOKEN: '' },
      { DATABASE_URL: '' },
      { ALLOWED_ORIGIN: 'invalid' },
    ]) {
      expect(() => readEnvironment(env, '/tmp/workspace')).toThrow();
    }
    expect(
      backendOptionsSchema.parse({
        databaseUrl: 'file:test.db',
        schemaPath: '/tmp/schema.prisma',
      }).port,
    ).toBe(0);
  });
});
