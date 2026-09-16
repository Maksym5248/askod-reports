import {
  AppShell,
  Group,
  Text,
  NavLink,
  Stack,
  Container,
  Alert,
} from '@mantine/core';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useIsMutating } from '@tanstack/react-query';
export function AppLayout() {
  const { pathname } = useLocation();
  const importing = useIsMutating({ mutationKey: ['imports', 'create'] }) > 0;
  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 230, breakpoint: 0 }}
      padding="xl"
    >
      <AppShell.Header>
        <Group h="100%" px="xl" justify="space-between">
          <Text fw={700} size="lg">
            ASKOD Звіти
          </Text>
          <Text size="sm" c="dimmed">
            Робочий простір
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Text size="xs" c="dimmed" mb="md">
          ЖУРНАЛ АСКОД
        </Text>
        <nav aria-label="Головна навігація">
          <Stack gap="xs">
            {[
              ['/documents', 'Документи'],
              ['/imports', 'Імпорти'],
              ['/settings', 'Налаштування'],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                component={Link}
                to={to!}
                label={label}
                active={pathname === to}
                aria-current={pathname === to ? 'page' : undefined}
              />
            ))}
          </Stack>
        </nav>
        <Text size="xs" c="dimmed" mt="auto">
          Дані для ваших майбутніх звітів
        </Text>
      </AppShell.Navbar>
      <AppShell.Main>
        <Container size="xl" px={0}>
          {importing && (
            <Alert mb="lg" role="status">
              Імпорт триває. Дочекайтеся завершення перед закриттям застосунку.
            </Alert>
          )}
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
