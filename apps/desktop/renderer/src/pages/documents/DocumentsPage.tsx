import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { documentsQuery } from '../../features/documents/queries';
import { usePreferences } from '../../stores/preferences.store';
import { QueryError } from '../../shared/ui/QueryError';
import styles from './DocumentsPage.module.css';
export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('page') ?? 1);
  const page =
    Number.isSafeInteger(raw) && raw > 0 && raw <= 1_000_000 ? raw : 1;
  const query = useQuery(documentsQuery(page));
  const compact = usePreferences((s) => s.compact);
  const go = (next: number) =>
    setParams((previous) => {
      const copy = new URLSearchParams(previous);
      copy.set('page', String(next));
      return copy;
    });
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>Документи</Title>
        <Button component={Link} to="/imports">
          Імпортувати журнал
        </Button>
      </Group>
      <Text c="dimmed">Збережені документи журналу АСКОД.</Text>
      {query.isPending && <Text role="status">Завантаження документів…</Text>}
      {query.isError && <QueryError retry={() => void query.refetch()} />}
      {query.data && (
        <>
          <Paper withBorder p="lg">
            <Title order={2} size="h4">
              Робочий простір готовий
            </Title>
            <Text c="dimmed">Документів у сховищі: {query.data.total}.</Text>
          </Paper>
          <Paper withBorder p="md">
            <Table.ScrollContainer minWidth={760}>
              <Table verticalSpacing={compact ? 'xs' : 'md'} highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {[
                      '№ документа',
                      'Дата',
                      'Зміст / вид',
                      'Заявник',
                      'Головний виконавець',
                    ].map((label) => (
                      <Table.Th key={label}>{label}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {query.data.items.map((doc) => (
                    <Table.Tr key={doc.id}>
                      <Table.Td className={styles.nowrap}>
                        {doc.registrationNumber}
                      </Table.Td>
                      <Table.Td className={styles.nowrap}>
                        {doc.registeredAt.split('-').reverse().join('.')}
                      </Table.Td>
                      <Table.Td className={styles.title}>
                        {doc.title}
                        <Text size="xs" c="dimmed">
                          {doc.documentType ?? '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>{doc.applicant ?? '—'}</Table.Td>
                      <Table.Td>{doc.chiefExecutor ?? '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {query.data.items.length === 0 && (
              <Text p="lg" c="dimmed">
                {query.data.total === 0
                  ? 'Документів ще немає. Імпортуйте перший журнал.'
                  : 'На цій сторінці немає документів. Поверніться на першу сторінку.'}
              </Text>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                disabled={page === 1}
                onClick={() => go(1)}
              >
                На початок
              </Button>
              <Button
                variant="default"
                disabled={page === 1}
                onClick={() => go(page - 1)}
              >
                Назад
              </Button>
              <Text size="sm">Сторінка {page}</Text>
              <Button
                variant="default"
                disabled={page * 25 >= query.data.total}
                onClick={() => go(page + 1)}
              >
                Далі
              </Button>
            </Group>
          </Paper>
        </>
      )}
    </Stack>
  );
}
