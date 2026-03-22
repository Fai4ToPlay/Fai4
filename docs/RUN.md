# Инструкция запуска

## 1. Подготовка
1. Установить Node.js 20+
2. Установить PostgreSQL 14+
3. Создать БД `fai4`
4. Применить схему:
   ```bash
   psql postgres://postgres:postgres@localhost:5432/fai4 -f db/schema.sql
   ```

## 2. Установка зависимостей
```bash
npm install
```

## 3. Переменные окружения
`apps/api/.env`:
```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fai4
JWT_SECRET=super-secret
WEB_URL=http://localhost:3000
```

`apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## 4. Запуск
### API
```bash
npm run dev -w apps/api
```

### Web
```bash
npm run dev -w apps/web
```

### Desktop
```bash
npm run dev -w apps/desktop
```

## 5. Первый пользователь
Добавьте админа SQL-командой (пароль заранее захэшировать bcrypt):
```sql
INSERT INTO users(email, password_hash, full_name, role)
VALUES ('admin@example.com', '$2a$10$examplehash...', 'System Admin', 'admin');
```

## 6. Базовые API
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/contractors`
- `GET/POST/PUT/DELETE /api/acts`
- `GET /api/acts/:id/export/pdf`
- `GET /api/acts/:id/export/excel`
- `POST /api/system/import/excel`
- `GET /api/system/audit-logs`
