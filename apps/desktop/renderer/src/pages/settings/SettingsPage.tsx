import { Paper, Stack, Switch, Text, Title } from '@mantine/core';
import { usePreferences } from '../../stores/preferences.store';
export default function SettingsPage() {
  const compact = usePreferences((s) => s.compact);
  const setCompact = usePreferences((s) => s.setCompact);
  return (
    <Stack>
      <Title order={1}>Налаштування</Title>
      <Text c="dimmed">Вигляд робочого простору на цьому пристрої.</Text>
      <Paper withBorder p="lg">
        <Switch
          label="Компактні таблиці"
          description="Зменшити відступи між рядками. Налаштування зберігається після перезапуску."
          checked={compact}
          onChange={(event) => setCompact(event.currentTarget.checked)}
        />
      </Paper>
    </Stack>
  );
}
