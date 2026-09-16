import {
  workspaceStatusSchema,
  importSummarySchema,
  importsSchema,
  documentsSchema,
} from '@askod/shared';
declare global {
  interface Window {
    askod?: { getRuntimeConfig(): Promise<{ apiUrl: string; token: string }> };
  }
}
export class ApiError extends Error {
  constructor(
    message: string,
    public issues: Array<{ row: number; field: string; message: string }> = [],
  ) {
    super(message);
  }
}
async function request(path: string, options: RequestInit = {}) {
  const config = window.askod
    ? await window.askod.getRuntimeConfig()
    : {
        apiUrl: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4310',
        token: '',
      };
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
  if (!response.ok)
    throw new ApiError(
      body.error ?? 'Не вдалося виконати запит',
      body.issues ?? [],
    );
  return body;
}
export async function getWorkspaceStatus(signal: AbortSignal) {
  return workspaceStatusSchema.parse(
    await request('/api/workspace', { signal }),
  );
}
export async function importJournal(file: File) {
  return importSummarySchema.parse(
    await request(`/api/imports?fileName=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }),
  );
}
export async function getDocuments(page: number, signal: AbortSignal) {
  return documentsSchema.parse(
    await request(`/api/documents?page=${page}&pageSize=25`, { signal }),
  );
}
export async function getImports(signal: AbortSignal) {
  return importsSchema.parse(await request('/api/imports', { signal }));
}
