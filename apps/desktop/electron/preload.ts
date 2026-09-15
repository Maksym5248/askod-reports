import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('askod', {
  getRuntimeConfig: (): Promise<{ apiUrl: string; token: string }> =>
    ipcRenderer.invoke('runtime-config'),
});
