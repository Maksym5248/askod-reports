import { Alert, Button } from '@mantine/core';
export function QueryError({ retry }: { retry: () => void }) {
  return (
    <Alert color="red" title="Не вдалося завантажити дані" role="alert">
      Перевірте зв’язок із сервером.
      <Button
        onClick={retry}
        variant="light"
        color="red"
        mt="sm"
        display="block"
      >
        Спробувати ще раз
      </Button>
    </Alert>
  );
}
