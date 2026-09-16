# Shared

`@askod/shared` — HTTP-контракти для backend і React renderer.

`src/contracts/` містить Zod-схеми та DTO для documents, imports, workspace і pagination.
Публічні експорти визначає `src/index.ts`.

Тут не повинно бути domain-моделей backend, Prisma, Electron, Node API,
з’єднань із базою чи сценаріїв імпорту. Кожен експорт має бути придатним для браузера.
Контракт описує дані на HTTP-межі; внутрішня модель може містити більше полів.
