import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  ActionIcon,
  Popover,
  Tooltip,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftType, setDraftType] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => setSearch(params.get('search') ?? ''), [params]);
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
        <Title order={1}>Вхідні документи</Title>
        <Popover width={320} position="bottom-end" withArrow>
          <Popover.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Довідка про таблицю"
            >
              ⓘ
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <Text size="sm">
              Клікніть клітинку для редагування. Зміни зберігаються в історії.
              Новий імпорт може перезаписати ручні виправлення.
            </Text>
          </Popover.Dropdown>
        </Popover>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <form
          style={{ flex: 1, minWidth: 0 }}
          onSubmit={(event) => {
            event.preventDefault();
            set('search', search.trim());
          }}
        >
          <TextInput
            aria-label="Пошук за номером, змістом або заявником"
            placeholder="Пошук за номером, змістом або заявником…"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            rightSection={
              search ? (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label="Очистити пошук"
                  onClick={() => {
                    setSearch('');
                    set('search', '');
                  }}
                >
                  ×
                </ActionIcon>
              ) : null
            }
          />
        </form>
        <Popover
          opened={filtersOpen}
          onChange={setFiltersOpen}
          width={300}
          position="bottom-end"
          withArrow
        >
          <Popover.Target>
            <Button
              variant={params.get('documentType') ? 'light' : 'default'}
              onClick={() => {
                setDraftType(params.get('documentType'));
                setFiltersOpen(!filtersOpen);
              }}
            >
              Фільтри{params.get('documentType') ? ' · 1' : ''}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              <Select
                label="Вид документа"
                placeholder="Усі види"
                clearable
                comboboxProps={{ withinPortal: false }}
                data={
                  columns.data?.find((c) => c.field === 'documentType')
                    ?.allowedValues ?? []
                }
                value={draftType}
                onChange={setDraftType}
              />
              <Group justify="space-between">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setDraftType(null);
                    set('documentType', '');
                    setFiltersOpen(false);
                  }}
                >
                  Скинути
                </Button>
                <Button
                  onClick={() => {
                    set('documentType', draftType ?? '');
                    setFiltersOpen(false);
                  }}
                >
                  Застосувати
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
        <Button
          variant="default"
          disabled={!columns.data || !query.data}
          onClick={() => setSettingsOpen(true)}
        >
          Колонки
        </Button>
        <Tooltip label="Оновити">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Оновити"
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9" />
            </svg>
          </ActionIcon>
        </Tooltip>
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
          <DocumentsTable
            key={normalized.toString()}
            items={query.data.items}
            metadata={columns.data}
            page={page}
            settings={settingsOpen}
            onSettingsClose={() => setSettingsOpen(false)}
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
            <Text size="sm" c="dimmed" aria-label="Діапазон документів">
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
