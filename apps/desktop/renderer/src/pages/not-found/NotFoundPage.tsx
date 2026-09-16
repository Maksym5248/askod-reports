import { Button, Stack, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <Stack align="start">
      <Title order={1}>Сторінку не знайдено</Title>
      <Button component={Link} to="/documents">
        До документів
      </Button>
    </Stack>
  );
}
