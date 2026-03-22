# Архитектура проекта

## 1) Общая модель
- **Web:** Next.js + Ant Design (разделы меню и формы).
- **Desktop:** Electron (тот же UI, что и в web).
- **API:** Node.js + Express, MVC-структура.
- **DB:** PostgreSQL.
- **Документы:** PDF/Excel экспорт по каждому акту.
- **Excel migration:** импорт `.xlsm/.xlsx` для автоматического анализа листов и полей.

## 2) Слои backend (MVC)
- `routes` → маршрутизация REST.
- `controllers` → orchestration/use-cases.
- `services` → Excel/PDF и доменная логика.
- `config` → env + DB.
- `middleware` → JWT + роли.

## 3) Основные сущности
- Users (auth + role)
- Contractors (справочник)
- Acts (все типы актов, унифицировано)
- Defects (таблица дефектов)
- CommercialOfferItems (строки КП)
- EquipmentDefects (спец-данные по оборудованию)
- AuditLogs (история изменений)
- ExcelTemplates (метаданные шаблонов из .xlsm)

## 4) Взаимосвязи
- Contractors → Acts (1:N)
- Acts → Defects (1:N)
- Acts(source_act_id) → Acts (N:1) для "Акт об устранении"
- Acts → CommercialOfferItems (1:N)
- Acts → EquipmentDefects (1:N)

## 5) Автоматизации
- Автосохранение формы в localStorage (web).
- 3-дневные акты: автоматический `due_date = act_date + 3`.
- Экспорт PDF/Excel из API.
- Импорт Excel-шаблонов с анализом структуры листов.
