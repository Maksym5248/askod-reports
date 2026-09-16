import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Group,
  Pagination,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  documentsQuery,
  documentColumnsQuery,
} from '../../features/documents/queries';
import { DocumentsTable } from '../../features/documents/components/DocumentsTable';
import { QueryError } from '../../shared/ui/QueryError';
import styles from './DocumentsPage.module.css';
export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const raw = Number(params.get('page') ?? 1);
  const page =
    Number.isSafeInteger(raw) && raw > 0 && raw <= 1_000_000 ? raw : 1;
  const normalized = new URLSearchParams(params);
  normalized.set('page', String(page));
  normalized.set('pageSize', '25');
  const query = useQuery(documentsQuery(normalized.toString()));
  const columns = useQuery(documentColumnsQuery);
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 25));
  useEffect(() => {
    if (query.data && page > totalPages) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('page', String(totalPages));
          return next;
        },
        { replace: true },
      );
    }
  }, [query.data, page, totalPages, setParams]);
  function set(key: string, value: string, reset = true) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (reset) next.set('page', '1');
      return next;
    });
  }
  return (
    <Stack gap="xs" className={styles.page}>
      <Group justify="space-between">
        <Title order={1}>Документи</Title>
        <Button component={Link} to="/imports">
          Імпортувати журнал
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Клікніть клітинку для редагування. Новий імпорт може перезаписати ручні
        виправлення; історія змін зберігається.
      </Text>
      <Group align="end">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            set('search', search);
          }}
        >
          <Group align="end">
            <TextInput
              label="Пошук за номером, змістом або заявником"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={360}
            />
            <Button type="submit" variant="default">
              Знайти
            </Button>
          </Group>
        </form>
        <Select
          label="Вид документа"
          placeholder="Усі види"
          clearable
          data={
            columns.data?.find((c) => c.field === 'documentType')
              ?.allowedValues ?? []
          }
          value={params.get('documentType')}
          onChange={(value) => set('documentType', value ?? '')}
        />
        <Button
          variant="subtle"
          onClick={() => {
            setSearch('');
            setParams({});
          }}
        >
          Скинути фільтри
        </Button>
        <Button variant="subtle" onClick={() => void query.refetch()}>
          Оновити
        </Button>
      </Group>
      {(query.isPending || columns.isPending) && (
        <Text role="status">Завантаження документів…</Text>
      )}
      {(query.isError || columns.isError) && (
        <QueryError
          retry={() => {
            void query.refetch();
            void columns.refetch();
          }}
        />
      )}
      {query.data && columns.data && (
        <>
          <Group justify="space-between">
            <Title order={2} size="h5">
              Робочий простір готовий
            </Title>
            <Text size="sm">Документів у сховищі: {query.data.total}.</Text>
          </Group>
          <DocumentsTable
            key={normalized.toString()}
            items={query.data.items}
            metadata={columns.data}
            page={page}
            sortBy={params.get('sortBy') ?? 'registeredAt'}
            direction={params.get('sortDirection') ?? 'desc'}
            onSort={(field) =>
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set('sortBy', field);
                next.set(
                  'sortDirection',
                  previous.get('sortBy') === field &&
                    previous.get('sortDirection') === 'asc'
                    ? 'desc'
                    : 'asc',
                );
                next.set('page', '1');
                return next;
              })
            }
          />
          {query.data.total === 0 && (
            <Alert>Документів немає або вони не відповідають фільтрам.</Alert>
          )}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {query.data.total === 0
                ? '0 документів'
                : `${Math.min((page - 1) * 25 + 1, query.data.total)}–${Math.min(page * 25, query.data.total)} з ${query.data.total}`}
            </Text>
            <Pagination
              aria-label="Пагінація документів"
              total={totalPages}
              value={Math.min(page, totalPages)}
              onChange={(next) => set('page', String(next), false)}
              disabled={query.data.total === 0}
              withEdges
              siblings={1}
              boundaries={1}
              size="sm"
              getItemProps={(item) => ({
                'aria-label': `Сторінка ${item}`,
                'aria-current': item === page ? 'page' : undefined,
              })}
              getControlProps={(control) => ({
                'aria-label': {
                  first: 'Перша сторінка',
                  previous: 'Назад',
                  next: 'Далі',
                  last: 'Остання сторінка',
                }[control],
              })}
            />
          </Group>
        </>
      )}
    </Stack>
  );
}
