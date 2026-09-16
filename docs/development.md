# Розробка

## З чого почати

1. Прочитайте кореневий README та [архітектуру](architecture.md).
2. Виконайте `npm ci`, потім `npm run dev` або `npm run dev:backend`.
3. Знайдіть відповідний HTTP-модуль у `apps/backend/src/modules`.
4. Перейдіть від контролера до use case, його інтерфейсів і реалізації в infrastructure.

Команди запускаються з кореня репозиторію, якщо інше не зазначено.

## Як додати можливість

Наприклад, фільтр документів або новий звіт. У цьому списку всі шляхи наведені
від кореня репозиторію:

1. Визначте моделі й бізнес-правила в `apps/backend/src/domain`, якщо вони потрібні.
2. Додайте сценарій у `apps/backend/src/application/use-cases/<feature>`.
   Його залежності опишіть у `apps/backend/src/application/interfaces`; використовуйте мінімально потрібні методи.
3. Реалізуйте роботу з базою, Excel чи зовнішнім API в `apps/backend/src/infrastructure`.
   Перетворення Prisma-моделей тримайте в `apps/backend/src/infrastructure/database/mappers`.
4. Додайте запит/відповідь у `packages/shared/src/contracts/<feature>.ts`.
   Експортуйте контракт із shared index; він має працювати в браузері.
5. Додайте routes і controller у `apps/backend/src/modules/<feature>`.
   Контролер перевіряє вхід через `parseRequest`, викликає сценарій і формує DTO.
6. Підключіть залежність у `apps/backend/src/bootstrap/create-dependencies.ts`
   і маршрут у `apps/backend/src/app.ts`.
7. Додайте клієнтський HTTP-виклик та інтерфейс у renderer.
8. Перевірте бізнес-поведінку, HTTP і інтеграцію зі сховищем залежно від зміни.

Не створюйте новий workspace для кожної можливості. Спершу додавайте модуль
усередині backend. Окремий пакет потрібен лише за реальної потреби незалежного використання.
Не змішуйте use cases й технологічні adapters у загальній папці `services`.

## Зміни бази

Схема й міграції належать backend: `apps/backend/prisma`.

```sh
# Після зміни schema.prisma, використовуючи окрему dev-базу:
DATABASE_URL="file:/absolute/path/to/development.db" \
  npx prisma migrate dev --schema apps/backend/prisma/schema.prisma --name descriptive_change
npm run db:generate
```

Не запускайте `migrate dev` або `reset` на користувацькій базі.
Використовуйте абсолютний SQLite URL; каталог має існувати.
Нові міграції додавайте в репозиторій. Уже застосовані міграції не редагуйте.
При запуску застосунок виконує `prisma migrate deploy`.
Переміщення папки міграцій саме по собі не змінює їхній вміст і не скидає дані.

Зараз backend розраховано на один локальний процес імпорту. Для кількох серверних
процесів потрібно окремо визначити чергу імпорту та поведінку повторних спроб.

## Перевірки

```sh
npm run build                  # Prisma generate, TypeScript, desktop та backend
npm test                       # усі backend tests, включно з межами шарів
npm run test -w @askod/backend  # ті самі серверні тести з workspace
npm run format:check
npm run test:desktop            # після build, потрібна GUI-сесія
```

`npm run format` форматує код. CI запускає build і tests.
Smoke test перевіряє запуск Electron, готовність робочого простору та ізоляцію Node.
`npm run test:e2e` запускає всі сценарії з окремими тимчасовими профілями й базами:
імпорт, редагування, видалення, навігацію та налаштування таблиці.
Помилки мають screenshot, trace і HTML-звіт. [Детальний посібник E2E](e2e-testing.md).
Тести не змінюють користувацькі документи.

## Правила даних та помилок

- Ключ документа: номер + рік реєстрації. Не замінюйте його повною датою без узгодження.
- Зберігайте історію й початкові значення. Не виправляйте текст джерела автоматично.
- Не перетворюйте пропуски на нулі. Не зберігайте телефони як числа.
- Помилки рядків — `ImportValidationError`; технічні деталі не потрапляють у HTTP-відповідь.
- Вихідний DTO має пройти свою Zod-схему. Помилка DTO — серверна помилка.
- Реальні журнали, персональні дані, бази й токени не додавайте до тестових fixtures або git.

## Де шукати проблему запуску

- `ELECTRON_RUN_AS_NODE=1`: приберіть цю змінну для GUI запуску.
- Prisma Client не згенеровано: `npm run db:generate`.
- TypeScript не бачить `registrationNumber_registrationYear`: виконайте `npm run db:generate`.
  Цей ключ генерується з `@@unique([registrationNumber, registrationYear])` у Prisma-схемі.
  Якщо перевірка `npm run typecheck` проходить, а редактор усе ще показує помилку,
  виконайте у VS Code `TypeScript: Restart TS Server`. `npm ci` / `npm install`
  автоматично генерують клієнт через `postinstall`; після змін схеми його потрібно оновити знову.
- Порт зайнятий: змініть `PORT` для standalone; Electron сам обирає вільний порт.
- Дані відрізняються між desktop і standalone: вони мають різні типові SQLite-шляхи.
- Власний шлях БД не відкривається: перевірте існування каталогу та права запису.
