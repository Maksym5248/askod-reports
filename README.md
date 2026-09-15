# ASKOD Reports

Перший етап: базовий запуск desktop-застосунку та перевірка архітектури.

## Вибір boilerplate

Основа — [electron-vite](https://electron-vite.org/guide/) з React + TypeScript,
адаптована вручну до npm workspaces. Electron main, preload та React збираються окремо.
Немає Next.js. Використано electron-vite 5 / Vite 7 / Electron 44 / Prisma 6 на Node 24.
Версії зафіксовано у package-lock.json. Prisma 6 використовує query engine без
нативного SQLite Node adapter, який потребував би окремої перебудови для Electron ABI.

## Запуск

Потрібні Node.js 24.15+ (24.x), npm 10+, desktop-середовище.

```sh
npm ci
npm run dev
```

Перший запуск генерує Prisma Client та застосовує committed migrations.
Вікно показує реальну кількість документів із SQLite через HTTP API.
Імпорт, фільтри й звіти ще не реалізовано; картки на екрані позначено як заплановані.
ExcelJS додано лише як залежність infrastructure до погодження формату експорту АСКОД.

```sh
npm run build
npm run preview
npm test
npm run typecheck
```

`build` збирає desktop та окремий Node API. `preview` запускає зібраний desktop
із checkout. Інсталятор, підпис, автооновлення та пакування Prisma ще не налаштовані.

## Окремий API

Запускати з кореня репозиторію:

```sh
npm run dev:api
# або після build:
npm run start:api
curl http://127.0.0.1:4310/api/workspace
```

Змінні: `PORT` (4310), `DATABASE_URL` (file:<repo>/.data/askod.db),
`API_TOKEN` (optional bearer token), `ALLOWED_ORIGIN` (точний origin web renderer).
Standalone API слухає loopback; зовнішній deployment, TLS та автентифікація — окремий етап.
Для браузерної розробки можна запустити Vite renderer із `VITE_API_URL` і дозволеним
`ALLOWED_ORIGIN`; токен desktop ніколи не записується в build або localStorage.

## Межі залежностей

```text
React ──HTTP──> Express ──> application ──> domain
Electron ──> API bootstrap ──> infrastructure ──> application / domain
React / Express ──> shared (HTTP DTO + Zod)
```

- `domain`: незалежні моделі, без ORM/framework imports.
- `application`: use cases та порти. `GetWorkspaceStatus` залежить від `DocumentRepository`.
- `infrastructure`: реалізація repository через Prisma, з'єднання й міграції SQLite.
- `shared`: HTTP contracts. Не контейнер для бізнес-логіки.
- `api`: HTTP middleware, DTO mapping та композиція залежностей.
- `desktop`: lifecycle, userData path, локальний API, ізольований preload, React UI.

Renderer отримує через вузький preload лише адресу API й тимчасовий токен.
Усі дані йдуть HTTP. Node integration вимкнено, context isolation і sandbox увімкнено.
API використовує loopback, випадковий desktop-порт, перевірку origin і токен сесії.
База desktop: `app.getPath('userData')/askod.db`; standalone: `.data/askod.db`.

Міграції запускаються через стандартний `prisma migrate deploy`, не `db push`.
Prisma CLI потрібен під час запуску цієї checkout-версії; production-пакування повинно
включати CLI/engines/schema/migrations або окремо визначити deployment migration step.

## Наступні етапи

1. Отримати анонімізований ASKOD Excel, визначити колонки, типи, дати, дублікати.
2. Додати порт джерела даних та ExcelJS adapter, validation preview і транзакційний import use case.
3. Додати пагінацію/фільтри через repository та перший predefined report.
4. Додати порт export з ExcelJS adapter; PDF стане іншою реалізацією.
5. PostgreSQL: змінити Prisma provider, інфраструктурну конфігурацію та створити
   відповідні міграції й перенесення даних. Domain/use cases залишаються незалежними.
6. ASKOD REST API: новий adapter джерела; web: окремий bootstrap, auth та deployment.

`Import` і `Report` навмисно не деталізовано до визначення поведінки й формату даних.
Початкова модель Document попередня, не претендує на відповідність реальному ASKOD export.

## Перевірки

Vitest перевіряє use case, HTTP contract, desktop authorization/origin,
приховування внутрішніх помилок, міграцію нової SQLite бази й дані після рестарту API.

## Додаткові перевірки та обмеження

`npm run test:desktop` після build відкриває реальне Electron-вікно, перевіряє
готовність сховища та ізоляцію Node; знімок записується в `.data/desktop-smoke.png`.
Потрібна GUI-сесія. Smoke test використовує звичайну локальну desktop-базу.
`npm run format:check` перевіряє форматування; CI запускає build і Vitest.

Якщо середовище агента встановлює `ELECTRON_RUN_AS_NODE=1`, для ручного GUI запуску
в macOS/Linux використовуйте `env -u ELECTRON_RUN_AS_NODE npm run dev`.
Для React Fast Refresh лише dev HTML дозволяє inline scripts; зібрана версія — ні.

Поточний `npm audit` має 6 findings: Prisma CLI / deepmerge-ts (3 high),
ExcelJS / uuid (2 moderate), esbuild у tsup (1 low). Автоматичні major overrides
не застосовувалися. Перед production release потрібно оновити/перевірити ці залежності;
імпорт зовнішніх файлів у цьому етапі ще не підключено.
