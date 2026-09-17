# Desktop-дистрибутиви

Потрібні Node.js із `.node-version`, npm та доступ до мережі для завантаження
Electron, Prisma engines і пакувальних інструментів. Windows/Ubuntu — x64;
macOS — arm64 на Apple Silicon або x64 на Intel, відповідно до архітектури Node.js.

```sh
npm ci
npm run build:windows
# Ubuntu 22.04 / 24.04 x64:
npm run build:ubuntu
# На macOS:
npm run build:mac
```

Результат:

- `release/windows/`: NSIS-інсталятор `.exe` та ZIP з застосунком.
- `release/ubuntu/`: `.AppImage` та `.deb`.
- `release/mac/`: `.dmg` та ZIP із `.app` для поточної архітектури Mac.

Windows можна пакувати з macOS; запуск потрібно перевіряти на Windows.
Ubuntu-пакети збираються на Linux. У GitHub Actions є два незалежні ручні запуски:

- **Windows and Ubuntu distributions** — Windows та Ubuntu.
- **macOS distribution** — лише macOS, запускається окремо.

Обидва workflow запускають smoke та експорт звітів із вже запакованого executable.
Завантаження результатів — через Actions artifacts; автоматичної публікації немає.

## Склад пакета

`scripts/package-desktop.ts` створює ізольований каталог `.data/packaging/`:

1. Копіює зібраний Electron/React та Prisma schema/migrations.
2. Встановлює лише runtime-залежності за окремим lockfile з
   `apps/desktop/packaging/`.
3. Генерує Prisma Client для цільової ОС і перевіряє наявність query/schema engines.
4. Запускає electron-builder без публікації.

Шаблони звітів вбудовані у main bundle. Оригінали з Downloads, локальна база,
вихідний код та `.env` не копіюються. ASAR вимкнений, оскільки міграції запускають
Prisma CLI та виконувані engines із реальних шляхів. Залежності не збираються
повторно під ABI Electron: Prisma використовує Node-API.

Дистрибутив містить Prisma CLI для `migrate deploy` при запуску. Схема знаходиться
у `resources/app/prisma/schema.prisma`. База створюється у writable `userData`,
а не в директорії встановлення. Дані dev-профілю автоматично не переносяться.
Windows-деінсталяція не видаляє userData.

На macOS ресурси знаходяться всередині `.app/Contents/Resources/app`.
Для Apple Silicon використовується Prisma `darwin-arm64`, для Intel — `darwin`.
macOS-збірка виконується лише на Mac; universal-бінарник поки не створюється.
Запакований застосунок явно задає `PRISMA_SCHEMA_ENGINE_BINARY` і
`PRISMA_QUERY_ENGINE_LIBRARY`: CLI не повинен завантажувати заміни engines
всередину підписаного `.app`. Після E2E workflow перевіряє цілісність підпису.

## Перевірка готового застосунку

Встановіть `ASKOD_E2E_EXECUTABLE` у повний шлях до запакованого executable і
запустіть `npm run test:e2e -- smoke.spec.ts reports.spec.ts`.
Тести використовують тимчасовий профіль і не змінюють робочу базу.

Windows-пакети поки без цифрового підпису, тому Windows може показати попередження
про невідомого видавця. macOS має лише локальний ad-hoc підпис, без Developer ID
та нотаризації Apple; Gatekeeper може обмежити запуск завантаженого застосунку.
Сертифікати видавця й автоматичне оновлення не налаштовані.

При оновленні Prisma оновлюйте одночасно `prisma` та `@prisma/client` у runtime
manifest і lockfile. Для оновлення lockfile виконайте `npm install --package-lock-only
--ignore-scripts` у `apps/desktop/packaging/`.
