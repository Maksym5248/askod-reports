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
import styles from './AppLayout.module.css';
export function AppLayout() {
  const { pathname } = useLocation();
  const documents = pathname === '/documents';
  const importing = useIsMutating({ mutationKey: ['imports', 'create'] }) > 0;
  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 230, breakpoint: 0 }}
      padding={documents ? 'md' : 'xl'}
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
              ['/documents', 'Вхідні документи'],
              ['/imports', 'Імпорти'],
              ['/reports', 'Звіти'],
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
      <AppShell.Main className={documents ? styles.documentsMain : undefined}>
        <Container
          size="xl"
          fluid={documents}
          px={0}
          className={documents ? styles.documentsContent : undefined}
        >
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
