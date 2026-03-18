# FAI4 — Web + Desktop система актов (замена Excel .xlsm)

Монорепозиторий с:
- `apps/api` — Node.js (Express, MVC, REST API)
- `apps/web` — Next.js + Ant Design
- `apps/desktop` — Electron-оболочка для веб-приложения
- `db/schema.sql` — полная SQL-схема PostgreSQL

Поддерживает:
- Поля и взаимосвязи актов/справочников
- CRUD + поиск + фильтры + сортировка
- Импорт Excel (.xlsm/.xlsx)
- Экспорт PDF/Excel
- Роли пользователей (admin/user)
- Логи изменений
- Автосохранение форм
- 3-дневные акты с автодатой

## Один файл для запуска и проверки

Используйте единый скрипт:

```bash
./ONE_FILE_START_CHECK.sh setup
./ONE_FILE_START_CHECK.sh db
./ONE_FILE_START_CHECK.sh check
./ONE_FILE_START_CHECK.sh run
```

Для desktop-режима:

```bash
./ONE_FILE_START_CHECK.sh desktop
```

## Быстрый запуск

Подробно: `docs/RUN.md`

