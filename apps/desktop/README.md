# Desktop

`@askod/desktop` — Electron-доставка та React SPA. Команди виконуються з кореня:

```sh
npm run dev
npm run build
npm run preview
npm run test:desktop
npm run test:e2e
```

## Renderer

- React Router `HashRouter`: `#/documents`, `#/imports`, `#/settings`, fallback 404.
  Hash-маршрути працюють при завантаженні через `file://` та перезавантаженні.
- Mantine: layout, компоненти, тема, сповіщення. CSS Modules — локальні стилі.
- TanStack Query: HTTP-дані, loading/error, кеш 30 секунд, одна повторна спроба читання.
- TanStack Table: всі колонки, ширина, порядок, видимість і вибір рядків.
- Zustand: лише UI preferences; компактність таблиць зберігається в localStorage.
- Наявний fetch-клієнт перевіряє відповіді через Zod-контракти `@askod/shared`.

```text
renderer/src/
  app/                 providers, router, theme, layouts
  pages/               documents, imports, settings, not-found
  features/            API-функції, queries та mutations за можливостями
  shared/api/          fetch-клієнт та ApiError
  shared/config/       runtime config через preload або VITE_API_URL
  shared/ui/           спільні UI-компоненти
  stores/              preferences.store.ts
  main.tsx             точка входу
```

Сторінки завантажуються ліниво. Параметр `page` живе в URL; документи й історія —
у Query cache; вибраний File — у локальному стані сторінки. Серверні дані й токен
не записуються в Zustand або localStorage. Тема наразі світла.

Імпорт не має автоматичного retry: повторний POST створює нову історію.
Після успіху інвалідуються queries `documents`, `imports`, `workspace`.
Перехід на іншу сторінку не скасовує вже надісланий імпорт; layout показує його
стан, а глобальне сповіщення — результат. Для помилок даних доступна кнопка
завантаження XLSX-звіту з усіма помилками та дозволеними значеннями. Детальні помилки рядків доступні на
сторінці, з якої запущено імпорт, доки вона залишається відкритою.

## Межі залежностей

Electron main керує lifecycle та запускає backend. Preload відкриває тільки
`getRuntimeConfig`; React отримує конфігурацію через `shared/config`.
Renderer не імпортує backend, Prisma, Node API або Electron.
Локальна папка `renderer/src/shared` відрізняється від workspace `packages/shared`,
який містить HTTP-контракти.

Для вебдоставки знадобляться окрема Vite-конфігурація запуску/збірки, runtime config,
CORS та auth. За переходу на BrowserRouter сервер має повертати index.html для SPA-маршрутів.

## Перевірка

`tests/e2e/` містить незалежні Playwright Test сценарії: smoke, навігація,
імпорти, редагування, видалення й налаштування таблиці. Кожен тест запускається
в окремому профілі та SQLite-базі. `test:desktop` виконує тільки smoke,
`test:e2e` — увесь набір. Перед запуском потрібен `npm run build`.

[Сценарії та діагностика E2E](../../docs/e2e-testing.md) · [Правила таблиці](../../docs/document-table.md)

[Архітектура](../../docs/architecture.md) · [Розробка](../../docs/development.md)
