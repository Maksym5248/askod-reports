declare global {
  interface Window {
    askod?: { getRuntimeConfig(): Promise<{ apiUrl: string; token: string }> };
  }
}
export function getRuntimeConfig() {
  return window.askod
    ? window.askod.getRuntimeConfig()
    : Promise.resolve({
        apiUrl: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4310',
        token: '',
      });
}
