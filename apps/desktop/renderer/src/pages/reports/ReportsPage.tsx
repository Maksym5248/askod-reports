import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { reportCatalogSchema, reportDownloadSchema } from '@askod/shared';
import { request } from '../../shared/api/client';

export default function ReportsPage() {
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString('en-CA'));
  const [organization, setOrganization] = useState(
    'ГУ ДСНС України у Тернопільській області',
  );
  const catalog = useQuery({
    queryKey: ['reports'],
    queryFn: async () =>
      reportCatalogSchema.parse(await request('/api/reports')),
  });
  const download = useMutation({
    mutationFn: async (id: string) => {
      const file = reportDownloadSchema.parse(
        await request('/api/reports/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, from, to, organization }),
        }),
      );
      const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
      const type = file.fileName.endsWith('.xls')
        ? 'application/vnd.ms-excel'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
  return (
    <Stack>
      <Title order={1}>Звіти</Title>
      <Alert color="yellow">
        Шаблони заповнені частково. Порожня клітинка означає, що показник не
        визначено; це не нуль. Перед використанням звіту перевірте й доповніть
        його.
      </Alert>
      <Group align="end">
        <TextInput
          label="Початок періоду"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.currentTarget.value)}
        />
        <TextInput
          label="Кінець періоду"
          type="date"
          value={to}
          onChange={(e) => setTo(e.currentTarget.value)}
        />
      </Group>
      <TextInput
        label="Назва організації"
        value={organization}
        onChange={(e) => setOrganization(e.currentTarget.value)}
      />
      {catalog.isPending && <Text role="status">Завантаження шаблонів…</Text>}
      {catalog.isError && (
        <Alert color="red">
          Не вдалося завантажити шаблони.{' '}
          <Button onClick={() => void catalog.refetch()}>Повторити</Button>
        </Alert>
      )}
      {download.isError && (
        <Alert color="red" role="alert">
          {download.error.message}
        </Alert>
      )}
      {catalog.data?.map((report) => (
        <Card key={report.id} withBorder>
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={600}>{report.name}</Text>
              <Text size="sm" c="dimmed">
                {report.description}
              </Text>
            </div>
            <Button
              variant="default"
              disabled={
                download.isPending ||
                !from ||
                !to ||
                from > to ||
                !organization.trim()
              }
              onClick={() => download.mutate(report.id)}
            >
              Експорт {report.id.startsWith('appendix-') ? 'XLS' : 'DOCX'}
            </Button>
          </Group>
        </Card>
      ))}
      {download.isPending && <Text role="status">Формування файлу…</Text>}
    </Stack>
  );
}
