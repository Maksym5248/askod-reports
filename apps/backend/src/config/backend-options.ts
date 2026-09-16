import { z } from 'zod';

export const backendOptionsSchema = z.object({
  databaseUrl: z.string().min(1),
  schemaPath: z.string().min(1),
  host: z.string().trim().min(1).default('127.0.0.1'),
  port: z.number().int().min(0).max(65535).default(0),
  token: z.string().min(1).optional(),
  allowedOrigin: z.union([z.literal('null'), z.string().url()]).optional(),
});
export type BackendOptions = z.infer<typeof backendOptionsSchema>;
export type BackendOptionsInput = z.input<typeof backendOptionsSchema>;
export type HttpOptions = Pick<BackendOptions, 'token' | 'allowedOrigin'>;
