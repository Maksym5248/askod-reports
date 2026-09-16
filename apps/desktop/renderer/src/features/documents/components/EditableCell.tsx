import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import type { DocumentColumn, DocumentDto } from '@askod/shared';
import { updateDocument } from '../api';
export function EditableCell({
  document,
  column,
}: {
  document: DocumentDto;
  column: DocumentColumn;
}) {
  const current = document[column.field as keyof DocumentDto];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateDocument,
    retry: false,
    onSuccess: async () => {
      setEditing(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['documents'] }),
        client.invalidateQueries({
          queryKey: ['document-history', document.id],
        }),
      ]);
    },
  });
  const date = column.type.toLowerCase().includes('date');
  const editable = !['createdAt', 'updatedAt'].includes(column.field);
  function save() {
    if (!mutation.isPending)
      mutation.mutate({
        id: document.id,
        version: document.version,
        field: column.field,
        value: value === '' ? null : value,
      });
  }
  if (!editing)
    return (
      <UnstyledButton
        w="100%"
        style={{
          whiteSpace: 'pre-wrap',
          minHeight: 24,
          cursor: editable ? 'text' : 'default',
        }}
        aria-label={`Редагувати ${column.header}: ${current ?? 'порожньо'}`}
        disabled={!editable}
        onClick={() => {
          setValue(current == null ? '' : String(current));
          mutation.reset();
          setEditing(true);
        }}
      >
        {current == null
          ? '—'
          : date
            ? column.field === 'createdAt' || column.field === 'updatedAt'
              ? new Date(String(current)).toLocaleString('uk-UA')
              : String(current).split('-').reverse().join('.')
            : String(current)}
      </UnstyledButton>
    );
  return (
    <Stack
      gap="xs"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !mutation.isPending) {
          event.stopPropagation();
          setEditing(false);
        }
        if (
          event.key === 'Enter' &&
          (date || column.type === 'integer' || column.allowedValues) &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          save();
        }
      }}
    >
      {column.allowedValues ? (
        <Select
          aria-label={column.header}
          data={column.allowedValues}
          value={value || null}
          allowDeselect={!column.type.startsWith('required')}
          clearable={!column.type.startsWith('required')}
          onChange={(next) => setValue(next ?? '')}
          disabled={mutation.isPending}
          searchable
          autoFocus
        />
      ) : date || column.type === 'integer' ? (
        <TextInput
          aria-label={column.header}
          type={date ? 'date' : 'number'}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          disabled={mutation.isPending}
          autoFocus
        />
      ) : (
        <Textarea
          aria-label={column.header}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={10}
          disabled={mutation.isPending}
          autoFocus
        />
      )}
      {mutation.error && (
        <Text size="xs" c="red" role="alert">
          {mutation.error.message}
        </Text>
      )}
      <Group gap={4}>
        <Button size="compact-xs" loading={mutation.isPending} onClick={save}>
          Зберегти
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          disabled={mutation.isPending}
          onClick={() => setEditing(false)}
        >
          Скасувати
        </Button>
      </Group>
    </Stack>
  );
}
