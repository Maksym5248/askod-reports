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
Ubuntu-пакети збираються на Linux. У GitHub Actions є два незалежні workflow:

- **Windows and Ubuntu distributions** — Windows та Ubuntu; тег `v*` або ручний запуск.
- **macOS distribution** — лише macOS, запускається окремо.

Обидва workflow запускають smoke та експорт звітів із вже запакованого executable.
Без `release_tag` ручний запуск залишає результати лише в Actions artifacts.
Push тега або ручний запуск із `release_tag` публікує файли в GitHub Releases.

## Випуск версії та завантаження

1. Оновити версію в усіх workspace package.json, runtime manifest і обох lockfile.
2. Закомітити й надіслати зміни в GitHub.
3. Створити тег цієї версії на відповідному коміті, наприклад:

   ```sh
   git tag v0.1.1
   git push origin v0.1.1
   ```

4. Windows/Ubuntu workflow перевіряє відповідність версії тегу, збирає й тестує
   обидва пакети. Після успіху всіх jobs створює draft release, завантажує файли
   та SHA-256 і публікує реліз. На помилці завантаження реліз залишається draft.
5. Для macOS вручну запустити **macOS distribution** з `release_tag: v0.1.1`.
   Workflow збирає саме код тега й додає файли до вже опублікованого релізу.

Публікація виконується автоматичним `GITHUB_TOKEN` з `contents: write` лише в
publish job. Файли з однаковими назвами й різними контрольними сумами не
перезаписуються: для зміненого білда потрібна нова версія. Immutable releases
несумісні з відкладеним додаванням macOS. Релізи серіалізовані за тегом, тому
паралельні workflows не завантажують файли одночасно.

## GitHub Pages

Сторінка завантажень: `https://maksym5248.github.io/askod-reports/`.
Вихідний код — `site/`, локальний запуск — `npm run site:dev`, збірка —
`npm run site:build`. Сайт не потребує бекенду й отримує список файлів останнього
опублікованого stable release через публічний GitHub API. Релізів немає —
показує очікування; збірки macOS немає — не створює вигаданого посилання.
За помилки API залишається посилання на Releases. Старі macOS-файли не
підставляються замість поточної версії.

Одноразово ввімкнути **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Workflow **Download page** публікує сайт при зміні його файлів
у `main` або вручну. Нові релізи й додані macOS-файли відображаються без
перезбирання сайту. Токени й приватні дані на сторінку не потрапляють.

`environment.name: github-pages` — стандартна назва середовища розгортання,
а не змінна. Якщо редактор показує `Value 'github-pages' is not valid`,
перевірте **Settings → Environments**: створіть середовище `github-pages`,
якщо його немає, та оновіть дані розширення GitHub Actions / перезавантажте
редактор. Не потрібно замінювати назву на expression або видаляти `environment`.
Налаштування Pages виконується адміністратором репозиторію одноразово.

`npm run site:test` перевіряє посилання, відсутні збірки, помилки API та
мобільний вигляд (перед запуском: `npx playwright install chromium`).

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
