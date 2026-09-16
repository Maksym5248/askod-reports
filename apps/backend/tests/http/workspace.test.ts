import { testDependencies } from '../helpers/dependencies';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { GetWorkspaceStatus } from '../../src/application/index';
import { createApp } from '../../src/app';

describe('workspace vertical slice', () => {
  const status = new GetWorkspaceStatus({ count: async () => 7 });
  it('reads through the repository port', async () => {
    expect(await status.execute()).toEqual({ documentCount: 7 });
  });
  it('returns a validated DTO over HTTP', async () => {
    const result = await request(
      createApp(testDependencies({ getWorkspaceStatus: status })),
    ).get('/api/workspace');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ documentCount: 7 });
  });
  it('requires the desktop bearer token and rejects foreign origins', async () => {
    const app = createApp(testDependencies({ getWorkspaceStatus: status }), {
      token: 'secret',
      allowedOrigin: 'http://localhost:5173',
    });
    expect((await request(app).get('/api/workspace')).status).toBe(401);
    expect(
      (
        await request(app)
          .get('/api/workspace')
          .set('Authorization', 'Bearer secret')
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get('/api/workspace')
          .set('Origin', 'https://untrusted.example')
          .set('Authorization', 'Bearer secret')
      ).status,
    ).toBe(403);
    const preflight = await request(app)
      .options('/api/workspace')
      .set('Origin', 'http://localhost:5173');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });
  it('does not expose database errors', async () => {
    const app = createApp(
      testDependencies({
        getWorkspaceStatus: new GetWorkspaceStatus({
          count: async () => {
            throw new Error('private database path');
          },
        }),
      }),
    );
    const result = await request(app).get('/api/workspace');
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain('private database path');
  });
});
