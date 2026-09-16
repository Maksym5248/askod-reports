import { useMemo, useState, type CSSProperties } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Column,
} from '@tanstack/react-table';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentDto, DocumentColumn } from '@askod/shared';
import { useTablePreferences } from '../../../stores/table-preferences.store';
import { usePreferences } from '../../../stores/preferences.store';
import { EditableCell } from './EditableCell';
import { DocumentHistory } from './DocumentHistory';
import { deleteDocuments } from '../api';
import styles from './DocumentsTable.module.css';
export function DocumentsTable({
  items,
  metadata,
  page,
  sortBy,
  direction,
  onSort,
}: {
  items: DocumentDto[];
  metadata: DocumentColumn[];
  page: number;
  sortBy: string;
  direction: string;
  onSort: (field: string) => void;
}) {
  const prefs = useTablePreferences();
  const compact = usePreferences((s) => s.compact);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [history, setHistory] = useState<string | null>(null);
  const client = useQueryClient();
  const deletion = useMutation({
    mutationFn: deleteDocuments,
    retry: false,
    onSuccess: async () => {
      setSelection({});
      setConfirm(false);
      await Promise.all(
        ['documents', 'workspace', 'document-history'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
  const fields = useMemo(
    () => [
      ...metadata,
      { field: 'createdAt', header: 'Створено в застосунку', type: 'date' },
      { field: 'updatedAt', header: 'Оновлено в застосунку', type: 'date' },
    ],
    [metadata],
  );
  const columns = useMemo<ColumnDef<DocumentDto>[]>(
    () => [
      {
        id: 'selection',
        size: 48,
        enableResizing: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Вибрати поточну сторінку"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Вибрати ${row.original.registrationNumber}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      ...fields.map((column) => ({
        id: column.field,
        header: column.header,
        size:
          column.field === 'sourceOrdinal'
            ? 65
            : column.field === 'title'
              ? 380
              : 190,
        cell: ({ row }: { row: { original: DocumentDto; index: number } }) =>
          column.field === 'sourceOrdinal' ? (
            (page - 1) * 25 + row.index + 1
          ) : (
            <EditableCell document={row.original} column={column} />
          ),
      })),
      {
        id: 'history',
        header: 'Історія',
        size: 120,
        cell: ({ row }) => (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setHistory(row.original.id)}
          >
            Історія
          </Button>
        ),
      },
    ],
    [fields, page],
  );
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    state: {
      columnOrder: prefs.order,
      columnVisibility: prefs.visibility,
      columnSizing: prefs.sizing,
      rowSelection: selection,
      columnPinning: {
        left: [
          'selection',
          'sourceOrdinal',
          'registrationNumber',
          'registeredAt',
        ],
        right: [],
      },
    },
    onRowSelectionChange: setSelection,
    onColumnSizingChange: (updater) =>
      prefs.setSizing(
        typeof updater === 'function' ? updater(prefs.sizing) : updater,
      ),
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 65, maxSize: 900 },
  });
  const selected = table.getSelectedRowModel().rows.map((row) => ({
    id: row.original.id,
    version: row.original.version,
  }));
  const known = columns.map((c) => c.id!);
  const order = [
    ...prefs.order.filter((id) => known.includes(id)),
    ...known.filter((id) => !prefs.order.includes(id)),
  ];
  function move(id: string, delta: number) {
    const next = [...order];
    const index = next.indexOf(id);
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    prefs.setOrder(next);
  }
  function pinned(column: Column<DocumentDto>): CSSProperties {
    return column.getIsPinned()
      ? { position: 'sticky', left: column.getStart('left'), zIndex: 2 }
      : {};
  }
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Group>
          <Text size="sm">Вибрано: {selected.length} (поточна сторінка)</Text>
          <Button
            color="red"
            variant="light"
            disabled={!selected.length || deletion.isPending}
            onClick={() => {
              deletion.reset();
              setConfirm(true);
            }}
          >
            Видалити вибрані
          </Button>
        </Group>
        <Button variant="default" onClick={() => setSettings(true)}>
          Колонки
        </Button>
      </Group>
      <div className={styles.viewport}>
        <table
          className={`${styles.table} ${compact ? styles.compact : ''}`}
          style={{ width: table.getTotalSize() }}
        >
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      ...pinned(header.column),
                      zIndex: header.column.getIsPinned() ? 4 : 3,
                    }}
                  >
                    {typeof header.column.columnDef.header === 'string' &&
                    !['sourceOrdinal', 'history'].includes(header.id) ? (
                      <UnstyledButton
                        fw={600}
                        size="xs"
                        onClick={() => onSort(header.id)}
                      >
                        {header.column.columnDef.header}
                        {sortBy === header.id
                          ? direction === 'asc'
                            ? ' ↑'
                            : ' ↓'
                          : ''}
                      </UnstyledButton>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                    {header.column.getCanResize() && (
                      <div
                        className={styles.resize}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      ...pinned(cell.column),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <Text p="lg">На цій сторінці немає документів.</Text>}
      </div>
      <Modal
        opened={settings}
        onClose={() => setSettings(false)}
        title="Налаштування колонок"
        size="lg"
      >
        <Stack gap="xs">
          <Button variant="light" onClick={prefs.reset}>
            Відновити вигляд як у файлі
          </Button>
          <Text size="xs" c="dimmed">
            Номер і дата закріплені ліворуч. Ширину змінюйте за правий край
            заголовка.
          </Text>
          {order
            .filter((id) => !['selection', 'history'].includes(id))
            .map((id) => {
              const field = fields.find((f) => f.field === id)!;
              const fixed = [
                'sourceOrdinal',
                'registrationNumber',
                'registeredAt',
              ].includes(id);
              return (
                <Group key={id} justify="space-between">
                  <Checkbox
                    label={field.header}
                    checked={prefs.visibility[id] !== false}
                    disabled={fixed}
                    onChange={(event) =>
                      prefs.setVisibility({
                        ...prefs.visibility,
                        [id]: event.currentTarget.checked,
                      })
                    }
                  />
                  <Group gap={4}>
                    <Button
                      size="compact-xs"
                      variant="default"
                      disabled={fixed || order.indexOf(id) <= 4}
                      aria-label={`Ліворуч ${field.header}`}
                      onClick={() => move(id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="default"
                      disabled={fixed || order.indexOf(id) >= order.length - 2}
                      aria-label={`Праворуч ${field.header}`}
                      onClick={() => move(id, 1)}
                    >
                      ↓
                    </Button>
                  </Group>
                </Group>
              );
            })}
        </Stack>
      </Modal>
      <Modal
        opened={confirm}
        onClose={() => {
          if (!deletion.isPending) setConfirm(false);
        }}
        title="Видалити документи?"
        closeOnEscape={!deletion.isPending}
        closeOnClickOutside={!deletion.isPending}
      >
        <Stack>
          <Text>
            Буде приховано {selected.length} документів. Історія збережеться.
            Повторний імпорт не відновлює їх автоматично.
          </Text>
          {deletion.error && (
            <Alert color="red" role="alert">
              {deletion.error.message}
            </Alert>
          )}
          <Group>
            <Button
              color="red"
              loading={deletion.isPending}
              onClick={() => deletion.mutate(selected)}
            >
              Підтвердити видалення
            </Button>
            <Button
              variant="default"
              disabled={deletion.isPending}
              onClick={() => setConfirm(false)}
            >
              Скасувати
            </Button>
          </Group>
        </Stack>
      </Modal>
      <DocumentHistory
        id={history}
        close={() => setHistory(null)}
        columns={fields}
      />
    </Stack>
  );
}
