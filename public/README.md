# Logoped — проект приема заявок

Frontend в /public, backend в /server. Сервер принимает заявки, сохраняет в data/applications.jsonl и отправляет уведомления в Telegram.

## Быстрый запуск (локально)

1. Перейти в папку server:
   cd server

2. Установить зависимости и создать .env:
   npm install
   cp .env.example .env
   # заполнить ADMIN_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

3. Запустить:
   npm run dev

4. Открыть в браузере:
   http://localhost:3000

## Админ: переключатель debug

GET /api/admin/debug — получить статус  
PATCH /api/admin/debug — изменить статус (header x-admin-secret: ADMIN_SECRET)

## Валидация и безопасность

- Чекбокс согласия обязателен и сохраняется запись заявки.  
- FILE uploads ограничены типами и размером.  
- Не храните .env в репозитории; используйте секреты хостинга в проде.  
- Для продакшена рекомендовано перенести данные в базу и файлы в защищённое хранилище.
