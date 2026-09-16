# ASKOD Reports

Desktop-застосунок для імпорту Excel-журналу АСКОД, збереження документів і підготовки
даних для майбутніх звітів. Інтерфейс українською. Backend також запускається окремим HTTP-сервером.

## Що вже працює

- Імпорт `.xlsx`: усі 43 колонки наданого формату, перевірка заголовків і значень.
- Збереження документів у SQLite через Prisma та історії кожного успішного імпорту.
- Повторний імпорт оновлює документ за **номером + роком дати реєстрації**.
- Перегляд документів із пагінацією та останніх 20 імпортів.
- SPA зі сторінками документів, імпортів і налаштувань; UI Mantine та збереження компактності таблиць.

Пошук, детальна картка, звіти й Excel/PDF-експорт ще не реалізовані.

## Швидкий старт

Потрібні Node.js **24.15+ (24.x)**, npm та desktop-сесія для Electron.
Версія Node зафіксована у `.node-version`, залежності — у `package-lock.json`.

```sh
npm ci
npm run dev
```

`npm ci` генерує Prisma Client через `postinstall`; `dev` повторює генерацію.
Під час кожного запуску backend застосовує незастосовані міграції.
Оберіть журнал на екрані й натисніть **Імпортувати в базу**.

```sh
npm run dev:backend       # тільки сервер, watch mode
npm run build             # зібрати backend і desktop
npm run start:backend     # зібраний сервер
npm run preview           # зібраний desktop із checkout
npm test                  # усі тести
npm run typecheck
npm run format:check
npm run test:desktop      # GUI smoke test після build
```

Якщо середовище агента встановило `ELECTRON_RUN_AS_NODE=1`, для GUI на macOS/Linux:
`env -u ELECTRON_RUN_AS_NODE npm run dev`.

## Карта репозиторію

```text
apps/
  backend/                 # сервер, бізнес-логіка, адаптери, Prisma й тести
  desktop/                 # Electron та React renderer
packages/
  shared/                  # HTTP-контракти й Zod-схеми для backend та renderer
scripts/
  smoke-desktop.ts         # перевірка реального Electron-вікна
docs/
  architecture.md          # відповідальності та межі залежностей
  development.md           # як змінювати й перевіряти проєкт
```

- [Архітектура](docs/architecture.md) — шари, процеси, шлях запиту, транзакції, модель даних і межі розвитку.
- [Розробка](docs/development.md) — додавання можливостей, тести, зміни бази.
- [Desktop](apps/desktop/README.md) — SPA, маршрути, стан і UI.
- [Backend](apps/backend/README.md) — структура сервера, env і HTTP endpoints.
- [Спільні контракти](packages/shared/README.md) — що дозволено спільному пакету.

## Де зберігаються дані

Desktop: `app.getPath('userData')/askod.db`. На macOS для поточного імені пакета:
`~/Library/Application Support/@askod/desktop/askod.db`.
Standalone backend: `<workspace>/.data/askod.db`, або шлях із `DATABASE_URL`.
Це різні бази за замовчуванням. Перейменування сервера не змінює desktop userData.

Вихідні Excel-файли не копіюються в репозиторій. У базі зберігаються значення рядків,
нормалізовані знімки та SHA-256 файла. Тести використовують синтетичні дані.

## Межі поточної версії

`build` і `preview` працюють із checkout монорепозиторію. Інсталятори, підпис,
автооновлення й самодостатній deployment image ще не налаштовані. Для розгортання
потрібно включити Prisma CLI/engines, schema та migrations.

Майбутній PostgreSQL потребуватиме іншого provider, міграцій і перенесення даних;
бізнес-сценарії залишаються незалежними від бази. Автентифікація користувачів,
TLS та конкурентні імпорти кількох серверних процесів — окремі етапи.

Відомі npm audit findings: Prisma CLI / deepmerge-ts, ExcelJS / uuid та esbuild
у tsup. Перед production-релізом потрібно оновити й перевірити ці залежності;
ліміти парсера не замінюють оновлення.
