import { workspaceStatusSchema } from '@askod/shared';
declare global {
  interface Window {
    askod?: { getRuntimeConfig(): Promise<{ apiUrl: string; token: string }> };
  }
}
export async function getWorkspaceStatus(signal: AbortSignal) {
  const config = window.askod
    ? await window.askod.getRuntimeConfig()
    : {
        apiUrl: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4310',
        token: '',
      };
  const response = await fetch(`${config.apiUrl}/api/workspace`, {
    signal,
    headers: config.token ? { Authorization: `Bearer ${config.token}` } : {},
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return workspaceStatusSchema.parse(await response.json());
}
