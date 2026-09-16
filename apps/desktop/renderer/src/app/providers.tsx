import { useState, type ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <QueryClientProvider client={client}>
        <Notifications />
        {children}
      </QueryClientProvider>
    </MantineProvider>
  );
}
