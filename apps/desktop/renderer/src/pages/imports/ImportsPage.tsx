import { downloadErrorReport } from '../../features/imports/download-error-report';
import { useState } from 'react';
import { useIsMutating, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  FileInput,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { importsQuery } from '../../features/imports/queries';
import { useImportJournal } from '../../features/imports/mutations';
import { ApiError } from '../../shared/api/api-error';
import { QueryError } from '../../shared/ui/QueryError';
import { usePreferences } from '../../stores/preferences.store';
export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState('');
  const history = useQuery(importsQuery);
  const mutation = useImportJournal();
  const busy = useIsMutating({ mutationKey: ['imports', 'create'] }) > 0;
  const compact = usePreferences((s) => s.compact);
  const error = mutation.error;
  function upload() {
    if (!file || busy) return;
    if (
      !/\.xlsx$/i.test(file.name) ||
      file.size === 0 ||
      file.size > 10 * 1024 * 1024
    ) {
      setValidation('Оберіть непорожній XLSX-файл розміром до 10 МБ.');
      return;
    }
    setValidation('');
    mutation.mutate(file, { onSuccess: () => setFile(null) });
  }
  return (
    <Stack gap="lg">
      <Alert color="yellow">
        Новий імпорт може перезаписати ручні виправлення документів. Попередні
        значення залишаться в історії.
      </Alert>
      <Title order={1}>Імпорти</Title>
      <Text c="dimmed">
        Завантаження журналів та історія останніх 20 успішних імпортів.
      </Text>
      <Paper withBorder p="lg">
        <Stack>
          <Title order={2} size="h3">
            Імпорт з Excel
          </Title>
          <Text size="sm" c="dimmed">
            Повторний імпорт оновлює документи за номером і роком реєстрації зі
            збереженням історії.
          </Text>
          <FileInput
            label="Файл журналу АСКОД"
            placeholder="Оберіть Excel-файл"
            accept=".xlsx"
            clearable
            value={file}
            disabled={busy}
            onChange={(value) => {
              setFile(value);
              setValidation('');
              mutation.reset();
            }}
          />
          <Group>
            <Button disabled={!file || busy} loading={busy} onClick={upload}>
              Імпортувати в базу
            </Button>
          </Group>
          {validation && (
            <Alert color="red" role="alert">
              {validation}
            </Alert>
          )}
          {error && (
            <Alert color="red" role="alert" title="Імпорт не завершено">
              {error.message}
              {error instanceof ApiError && error.report && (
                <Button
                  mt="sm"
                  variant="light"
                  color="red"
                  onClick={() => downloadErrorReport(error.report!)}
                >
                  Завантажити помилки Excel ({error.issueCount})
                </Button>
              )}
              {error instanceof ApiError &&
                error.issueCount > error.issues.length && (
                  <Text size="sm">
                    Показано перші {error.issues.length} помилок. Повний список
                    — у файлі Excel.
                  </Text>
                )}
              {error instanceof ApiError && error.issues.length > 0 && (
                <ul>
                  {error.issues.map((issue, i) => (
                    <li key={i}>
                      Рядок {issue.row}
                      {issue.field ? `, ${issue.field}` : ''}: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
          {mutation.data && (
            <Alert color="teal" role="status">
              Імпорт завершено: додано {mutation.data.created}, оновлено{' '}
              {mutation.data.updated}, без змін {mutation.data.unchanged}.
              Усього рядків: {mutation.data.totalRows}.
            </Alert>
          )}
        </Stack>
      </Paper>
      <Title order={2} size="h3">
        Історія імпортів
      </Title>
      {history.isPending && <Text role="status">Завантаження історії…</Text>}
      {history.isError && <QueryError retry={() => void history.refetch()} />}
      {history.data && (
        <Paper withBorder p="md">
          <Table.ScrollContainer minWidth={650}>
            <Table verticalSpacing={compact ? 'xs' : 'md'}>
              <Table.Thead>
                <Table.Tr>
                  {[
                    'Файл / дата',
                    'Рядків',
                    'Додано',
                    'Оновлено',
                    'Без змін',
                  ].map((label) => (
                    <Table.Th key={label}>{label}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {history.data.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      {item.fileName}
                      <Text size="xs" c="dimmed">
                        {new Date(item.importedAt).toLocaleString('uk-UA')}
                      </Text>
                    </Table.Td>
                    <Table.Td>{item.totalRows}</Table.Td>
                    <Table.Td>{item.created}</Table.Td>
                    <Table.Td>{item.updated}</Table.Td>
                    <Table.Td>{item.unchanged}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {history.data.length === 0 && (
            <Text p="lg" c="dimmed">
              Історія з’явиться після першого успішного імпорту.
            </Text>
          )}
        </Paper>
      )}
    </Stack>
  );
}
