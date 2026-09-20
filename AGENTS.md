# Инструкция для AI-агентов (AGENTS.md) — Проект ТСК «Авалон»

Этот файл является обязательным к прочтению для любого AI-ассистента перед внесением любых изменений в данный репозиторий.

---

## 1. Стек и архитектура

- **Фронтенд**: React 19 + TypeScript + Tailwind CSS v4 + Vite.
- **Бэкенд**: Bun + TypeScript + Express-совместимый HTTP-сервер + `grammY` (Telegram Bot API).
- **Хранилище**: Локальный JSON-store `server/data/content.json` с атомарной записью через `.tmp` файлы.
- **Сервер прод**: `tonivecher-new` (`root@95.85.254.72`), Nginx, systemd-сервис `avalon-bot.service` (`/opt/avalon-bot`).
- **Сайт**: `https://avalon.tonivecher.online`
- **Бот**: `@dusha_avalon_bot`
- **Канал**: `@dusha_avalon` (ID `-1002188408014`)

Подробный передаточный документ со всеми путями и параметрами: `HANDOVER_GUIDE.md`.

---

## 2. Дизайн-система: Строгие правила ضد AI Slop

Проект переведен на концепцию **«Дворцовый ночной люкс» (Editorial Estate Luxury + Olympic Black & Champagne Prestige)**. При любых изменениях фронтенда строго запрещено возвращать маркеры AI slop:

1. **Шрифты**:
   - Заголовки: `font-serif` (`Cormorant Garamond`). Использовать легкие начертания `font-normal` / `font-light`, акценты курсивом `italic`.
   - Основной текст: `font-sans` (`Plus Jakarta Sans`).
   - Бейджи, теги, статусы: `font-sans uppercase text-[10px]..text-[11px] tracking-[0.16em]..tracking-[0.22em] font-medium`.
   - **ЗАПРЕЩЕНО**: Использовать `font-mono` (`JetBrains Mono`) в пользовательском интерфейсе.

2. **Цветовая палитра (CSS токены в `src/index.css`)**:
   - Базовый холст: `#090A0E` (глубокий бархатный обсидиан).
   - Поверхности секций: `#11141C`.
   - Карточки: `#161B26`.
   - Акцентный металл: Шампанское золото `#D8BA7A`, светлое `#EBD8B0`, античная латунь `#BFA05E`.
   - **ЗАПРЕЩЕНО**: Использовать дешевое насыщенное желтое казино-золото `#D4AF37`.
   - Текст: матовый белый алебастр `#F8F6F0`, приглушенный сланец `#A3A8B5`.
   - Рамки: волосковые белые `border-white/[0.08]` и шампанские `border-[#D8BA7A]/30`.

3. **Иконки**:
   - **ЗАПРЕЩЕНО**: Ставить иконки `<Sparkles />` на кнопки или призывы к действию.
   - **ЗАПРЕЩЕНО**: Ставить декоративные иконки (`Trophy`, `Award`, `Calendar`, `MapPin`) перед пунктами навигации в шапке или перед заголовками секций. Навигация должна оставаться чистой эдиториал-типографикой.
   - Иконки разрешены только функциональные (телефон, закрыть меню, стрелка вправо, самолетик Telegram).

4. **Фоны**:
   - Все секции должны составлять единый монолитный ночной градиент. Никаких резких разрывов (нельзя делать белые или светло-серые секции).

---

## 3. Правила работы с бэкендом и данными

1. **Не затирать данные на сервере при rsync!**
   - На сервере живут актуальные файлы `server/data/content.json` (контент сайта) и `server/data/admins.json` (список админов), а также папка `server/uploads/` (фотографии, загруженные тренерами через Telegram).
   - При синхронизации `server/` на прод **всегда исключать** эти директории:
     ```bash
     rsync -avz --exclude 'data' --exclude 'uploads' server/ tonivecher-new:/opt/avalon-bot/server/
     ```

2. **Синхронизация с Telegram-каналом `@dusha_avalon`**:
   - В `server/bot.ts` настроен слушатель `bot.on('channel_post')` и `bot.on('edited_channel_post')`.
   - Если пост содержит фото, он скачивает оригинальный файл через Telegram API, сохраняет в `uploads/announcements/` и создает анонс.
   - Не ломать этот механизм при правках бота!

3. **AI Генерация**:
   - В `server/aiService.ts` настроен клиент к локальному OpenAI-прокси на сервере (`http://127.0.0.1:8045/v1`, модель `gemini-2.5-flash`).
   - Ключ автоматически считывается из `/opt/antigravity-manager/data/gui_config.json` либо из переменной `AI_API_KEY`.

---

## 4. Команды проверки и деплоя

### Сборка и деплой фронтенда
```bash
bun run build
rsync -avz --delete dist/ tonivecher-new:/var/www/avalon.tonivecher.online/current/
curl -I https://avalon.tonivecher.online
```

### Деплой бэкенда
```bash
rsync -avz --exclude 'data' --exclude 'uploads' server/ tonivecher-new:/opt/avalon-bot/server/
ssh tonivecher-new 'systemctl restart avalon-bot.service'
ssh tonivecher-new 'systemctl status avalon-bot.service --no-pager'
```

### Проверка логов бэкенда
```bash
ssh tonivecher-new 'journalctl -u avalon-bot.service -n 50 --no-pager'
```
