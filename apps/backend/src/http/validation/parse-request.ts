import type { ZodType, ZodTypeDef } from 'zod';
import { HttpError } from '../errors/http-error';

// Only invalid INPUT is a 400. An invalid use-case response is a server error.
export function parseRequest<T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, 'Некоректні параметри запиту');
  return result.data;
}
