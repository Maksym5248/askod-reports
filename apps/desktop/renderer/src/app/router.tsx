import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Text } from '@mantine/core';
import { AppLayout } from './layouts/AppLayout';
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage'));
const ImportsPage = lazy(() => import('../pages/imports/ImportsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('../pages/not-found/NotFoundPage'));
export function AppRouter() {
  return (
    <HashRouter>
      <Suspense
        fallback={
          <Text p="xl" role="status">
            Завантаження сторінки…
          </Text>
        }
      >
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/documents" replace />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="imports" element={<ImportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
