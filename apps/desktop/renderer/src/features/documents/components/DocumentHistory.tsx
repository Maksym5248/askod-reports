import { useQuery } from '@tanstack/react-query';
import { Accordion, Drawer, Table, Text } from '@mantine/core';
import type { DocumentColumn } from '@askod/shared';
import { getDocumentHistory } from '../api';
import { QueryError } from '../../../shared/ui/QueryError';
export function DocumentHistory({
  id,
  close,
  columns,
}: {
  id: string | null;
  close: () => void;
  columns: DocumentColumn[];
}) {
  const query = useQuery({
    queryKey: ['document-history', id],
    enabled: !!id,
    queryFn: ({ signal }) => getDocumentHistory(id!, signal),
  });
  return (
    <Drawer
      opened={!!id}
      onClose={close}
      title="Історія документа"
      position="right"
      size="xl"
    >
      {query.isPending && <Text>Завантаження…</Text>}
      {query.isError && <QueryError retry={() => void query.refetch()} />}
      <Accordion>
        {query.data?.map((item) => {
          const before = (item.before ?? {}) as Record<string, unknown>;
          const after = (item.after ?? {}) as Record<string, unknown>;
          return (
            <Accordion.Item value={item.id} key={item.id}>
              <Accordion.Control>
                {new Date(item.changedAt).toLocaleString('uk-UA')} —{' '}
                {item.source === 'manual'
                  ? 'Ручне редагування'
                  : item.source === 'delete'
                    ? 'Видалення'
                    : 'Імпорт'}
              </Accordion.Control>
              <Accordion.Panel>
                {item.source.startsWith('import') && (
                  <Text size="sm" c="dimmed">
                    Знімок документа під час імпорту (
                    {item.source.split(':')[1]}).
                  </Text>
                )}
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Поле</Table.Th>
                      <Table.Th>Було</Table.Th>
                      <Table.Th>Стало / знімок</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {columns
                      .filter(
                        (column) =>
                          column.field in after &&
                          before[column.field] !== after[column.field],
                      )
                      .map((column) => (
                        <Table.Tr key={column.field}>
                          <Table.Td>{column.header}</Table.Td>
                          <Table.Td>
                            {String(before[column.field] ?? '—')}
                          </Table.Td>
                          <Table.Td>
                            {String(after[column.field] ?? '—')}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
      {query.data?.length === 0 && <Text>Історія відсутня.</Text>}
    </Drawer>
  );
}
