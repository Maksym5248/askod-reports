import { expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { testDependencies } from '../helpers/dependencies';
import { ImportValidationError } from '../../src/domain/index';

it('treats invalid input as 400 but invalid output as 500', async () => {
  const app = createApp(
    testDependencies({
      getWorkspaceStatus: { execute: async () => ({ documentCount: -1 }) },
    }),
  );
  expect((await request(app).get('/api/documents?page=0')).status).toBe(400);
  expect((await request(app).get('/api/workspace')).status).toBe(500);
});
it('maps import issues without requiring an Excel adapter', async () => {
  const app = createApp(
    testDependencies({
      importJournal: {
        execute: async () => {
          throw new ImportValidationError([
            { row: 5, field: 'registeredAt', message: 'Некоректна дата' },
          ]);
        },
      },
      importFieldLabel: () => 'Дата реєстрації',
    }),
  );
  const result = await request(app)
    .post('/api/imports?fileName=journal.xlsx')
    .set('Content-Type', 'application/octet-stream')
    .send(Buffer.from('fixture'));
  expect(result.status).toBe(422);
  expect(result.body.issues).toEqual([
    { row: 5, field: 'Дата реєстрації', message: 'Некоректна дата' },
  ]);
});
it('registers document, import and not-found routes', async () => {
  const app = createApp(testDependencies());
  expect((await request(app).get('/api/documents')).body).toEqual({
    total: 0,
    items: [],
  });
  expect((await request(app).get('/api/imports')).body).toEqual([]);
  expect((await request(app).get('/missing')).status).toBe(404);
  expect(
    (
      await request(app)
        .post('/api/imports?fileName=journal.xlsx')
        .send('wrong content type')
    ).status,
  ).toBe(415);
});
