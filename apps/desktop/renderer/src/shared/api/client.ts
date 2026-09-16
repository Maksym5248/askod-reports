import { importErrorResponseSchema } from '@askod/shared';
import { getRuntimeConfig } from '../config/runtime-config';
import { ApiError } from './api-error';
export async function request(path: string, options: RequestInit = {}) {
  const config = await getRuntimeConfig();
  const headers = new Headers(options.headers);
  if (config.token) headers.set('Authorization', `Bearer ${config.token}`);
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      'Немає зв’язку з сервером. Перевірте історію імпортів перед повторною спробою.',
    );
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validation = importErrorResponseSchema.safeParse(body);
    if (validation.success)
      throw new ApiError(
        validation.data.error,
        validation.data.issues,
        validation.data.report,
        validation.data.issueCount,
      );
    throw new ApiError(
      body.error ?? 'Не вдалося виконати запит',
      body.issues ?? [],
    );
  }
  return body;
}
