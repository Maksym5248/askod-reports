# Backend

Сервер Express із внутрішніми шарами domain/application/infrastructure.
Приватний workspace-пакет: `@askod/backend`; точка інтеграції Electron — `startBackend`.

[Архітектура](../../docs/architecture.md) · [Правила розробки](../../docs/development.md)

## Запуск

З кореня монорепозиторію:

```sh
npm run db:generate
npm run dev -w @askod/backend
npm run build -w @askod/backend
npm run start -w @askod/backend
npm run typecheck -w @askod/backend
npm run test -w @askod/backend
```

Або використовуйте кореневі `npm run dev:backend` / `npm run start:backend`.
`dev` працює у watch mode. `build` створює `dist/main.js`.
`npm ci` / `npm install` у корені генерують Prisma Client через `postinstall`.
Після зміни Prisma-схеми виконайте `npm run db:generate` перед збіркою, перевіркою типів
чи тестами. Кореневі `dev`, `dev:backend` і `build` повторюють генерацію автоматично.

## Налаштування

| Змінна               | Типове значення                                 |
| -------------------- | ----------------------------------------------- |
| `HOST`               | `127.0.0.1`                                     |
| `PORT`               | `4310`                                          |
| `DATABASE_URL`       | `file:<workspace>/.data/askod.db`               |
| `PRISMA_SCHEMA_PATH` | `<workspace>/apps/backend/prisma/schema.prisma` |
| `API_TOKEN`          | не задано                                       |
| `ALLOWED_ORIGIN`     | не задано                                       |

Конфігурація перевіряється на старті. `.env` автоматично не читається; для Node 24
можна використати `node --env-file=.env dist/main.js` із каталогу backend.
Відносний `PRISMA_SCHEMA_PATH` відраховується від кореня workspace.
Для власного SQLite-шляху спершу створіть каталог. Типові шляхи однакові при запуску
з root, workspace та зібраного entrypoint.

Desktop передає налаштування явно та використовує порт `0` для автоматичного вибору.
Standalone потребує порту від 1 до 65535. Для зовнішнього deployment можна задати
`HOST=0.0.0.0`; TLS, авторизація користувачів та reverse proxy — окремі завдання.
Збірка потребує встановлених залежностей, Prisma CLI/engines, schema й migrations.

## HTTP

| Метод | Шлях                                 | Результат                            |
| ----- | ------------------------------------ | ------------------------------------ |
| GET   | `/api/workspace`                     | Кількість документів                 |
| GET   | `/api/documents?page=1&pageSize=25`  | Сторінка документів, pageSize до 100 |
| GET   | `/api/imports`                       | Останні 20 імпортів                  |
| POST  | `/api/imports?fileName=journal.xlsx` | Імпорт даних XLSX і підсумок         |

Для POST передайте байти файла з `Content-Type: application/octet-stream`
або `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
Сам XLSX не зберігається: у БД записуються дані рядків, знімки та метадані імпорту.
За встановленого токена додайте `Authorization: Bearer <token>`.

```sh
curl http://127.0.0.1:4310/api/workspace
curl --data-binary @journal.xlsx \
  -H 'Content-Type: application/octet-stream' \
  'http://127.0.0.1:4310/api/imports?fileName=journal.xlsx'
```

Успішний імпорт: `201`, `id`, `fileName`, `importedAt`, `totalRows`, `created`, `updated`, `unchanged`.
Помилки: `400` — параметри, `401/403` — доступ, `413` — розмір,
`415` — тип запиту, `422` — дані XLSX, `500` — внутрішня помилка.
Валідація вихідного DTO також повертає `500`, а не помилку користувача.

## Правила XLSX

Один заповнений аркуш, 43 заголовки в першому рядку. Колонки зіставляються за назвою,
їх можна переставляти. Невідомі, відсутні та повторені заголовки відхиляються.
Ліміти: 10 МіБ файла, 50 МіБ сумарного заявленого розміру ZIP entries після розпакування,
1000 ZIP entries, 10 000 рядків після заголовка та 100 позицій колонок аркуша.
Очікуються саме 43 відомі заголовки; значення в колонках без заголовка відхиляються.
Формули й Excel errors не виконуються та відхиляються.

Весь файл перевіряється до запису; помилка відхиляє весь імпорт, до 100 помилок
повертаються з номером рядка й назвою поля. Запис та історія — одна транзакція.
Порожні необов’язкові поля стають `null`; пропуски обов’язкових полів відхиляються.
Телефони/коди/номери зберігаються текстом.
Неясні поля `Дод.` та `Термін продовжено` зберігаються текстом без припущень.

## Життєвий цикл і тести

`server.ts` відкриває HTTP server і ресурси. `close()` ідемпотентний;
через 10 секунд сервер примусово закриває активні HTTP-з’єднання, після чого
від’єднує Prisma Client. Це не скасовує вже запущений use case і не гарантує
завершення всієї роботи з БД за 10 секунд.
Помилка зайнятого порту звільняє створені ресурси.

У `tests/`: architecture, config, http, integration і runtime.
HTTP-тести підставляють use cases без бази. Інтеграційні тести використовують
окремі тимчасові SQLite-бази та синтетичні Excel-файли.
