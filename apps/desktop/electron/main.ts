import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startApi } from '@askod/api';

const here = dirname(fileURLToPath(import.meta.url));
let api: Awaited<ReturnType<typeof startApi>> | undefined;
let window: BrowserWindow | undefined;
let closing = false;
const token = randomBytes(32).toString('hex');
const devUrl = process.env.ELECTRON_RENDERER_URL;

async function openWindow() {
  window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: resolve(here, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  if (devUrl) await window.loadURL(devUrl);
  else await window.loadFile(resolve(here, '../renderer/index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  void app
    .whenReady()
    .then(async () => {
      const directory = app.getPath('userData');
      await mkdir(directory, { recursive: true });
      api = await startApi({
        databaseUrl: `file:${resolve(directory, 'askod.db')}`,
        schemaPath: resolve(
          app.getAppPath(),
          '../../packages/infrastructure/prisma/schema.prisma',
        ),
        token,
        allowedOrigin: devUrl ? new URL(devUrl).origin : 'null',
      });
      ipcMain.handle('runtime-config', (event) => {
        if (
          !window ||
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame
        )
          throw new Error('Untrusted renderer');
        return { apiUrl: api!.url, token };
      });
      await openWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) void openWindow();
      });
    })
    .catch((error) => {
      console.error(error);
      dialog.showErrorBox(
        'Помилка запуску',
        'Не вдалося запустити застосунок або відкрити базу даних.',
      );
      app.quit();
    });
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', (event) => {
  if (closing || !api) return;
  event.preventDefault();
  closing = true;
  void api
    .close()
    .catch(console.error)
    .finally(() => app.quit());
});
