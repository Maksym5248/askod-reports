import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { importJournal } from './api';
export function useImportJournal() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['imports', 'create'],
    mutationFn: importJournal,
    retry: false,
    onSuccess: async (result) => {
      notifications.show({
        title: 'Імпорт завершено',
        message: `Додано: ${result.created}. Оновлено: ${result.updated}. Без змін: ${result.unchanged}.`,
        color: 'teal',
      });
      await Promise.all(
        ['documents', 'imports', 'workspace'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
    onError: () =>
      notifications.show({
        title: 'Імпорт не підтверджено',
        message:
          'Перевірте повідомлення на сторінці імпортів та історію перед повторною спробою.',
        color: 'red',
      }),
  });
}
