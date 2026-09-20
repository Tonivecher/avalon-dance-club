# Руководство по архитектуре, сопровождению и разработке ТСК «Авалон»
## Передаточный документ для разработчиков и AI-агентов

Данный документ содержит полное описание архитектуры, расположения файлов, учетных записей, алгоритмов работы сервисов, процедур развертывания и сценариев модификации для танцевально-спортивного клуба «Авалон» (Усадьба Свиблово).

---

## 1. Обзор системы и компонентов

Проект представляет собой цифровую экосистему клуба, состоящую из 4 ключевых подсистем:

1. **Публичный веб-сайт (`avalon.tonivecher.online`)**:
   - Стек: React 19, TypeScript, Vite, Tailwind CSS v4.
   - Дизайн-система: **«Дворцовый ночной люкс» (Editorial Estate Luxury + Olympic Black & Champagne Prestige)**.
   - Особенности: Никакого «AI slop» (отсутствие иконочного спама, отказ от JetBrains Mono в UI в пользу Plus Jakarta Sans, благородное шампанское золото вместо желтого, двойная фаска double-bezel, монолитный ночной холст `#090A0E`).
   - Динамика: Автоматическая подтяжка актуального контента с бэкенда через хук `useClubContent` (SWR-паттерн с автообновлением каждые 15 секунд).

2. **Бэкенд & CMS API (Node/Bun + Express-совместимый HTTP-сервер)**:
   - Расположен в `server/bot.ts` и `server/contentStore.ts`.
   - Работает на среде выполнения **Bun** на порту `3018` (проксируется через Nginx).
   - Хранилище: надежный JSON Content Store с атомарной записью через временные файлы (`safeWriteContent`).
   - Эндпоинты:
     - `GET /api/content` — полная структура данных (статус зала, анонсы, тренеры, расписание, галерея).
     - `POST /api/leads` — прием заявок на просмотр с сайта и мгновенная отправка в Telegram администраторам клуба.
     - `GET /health` — проверка работоспособности сервиса.
     - `GET /uploads/*` — отдача пользовательских медиафайлов.

3. **Telegram-бот администратора (`@dusha_avalon_bot`)**:
   - Фреймворк: `grammY`.
   - Интерактивная кнопочная CMS в Telegram:
     - Управление тренерами (просмотр карточек, замена фото, правка имени, регалий, описания, удаление, добавление).
     - Управление галереей турниров и сборов (замена фото, подписи, бейджи, удаление).
     - Управление расписанием по 7 дням недели (добавление/удаление занятий, наставники, залы, категории).
     - Управление оперативным статусом зала (бегущая строка / статус-плашка в Hero).
     - Управление анонсами и публикация постов в канал клуба.
     - Прием и оповещение о новых заявках на пробные уроки.

4. **Двусторонняя интеграция с Telegram-каналом `@dusha_avalon`**:
   - Автоматический перехват публикаций канала (`channel_post`, `edited_channel_post`).
   - При публикации фото или текста в канале бот автоматически сохраняет медиафайл в `uploads/announcements/`, парсит текст и публикует анонс на сайте.
   - Возможность из меню бота нажать «📢 Опубликовать в канале @dusha_avalon».

5. **AI Копирайтер (Gemini Copilot)**:
   - Модуль: `server/aiService.ts`.
   - Подключение: Локальный OpenAI-совместимый прокси на сервере `http://127.0.0.1:8045/v1` (модель `gemini-2.5-flash`).
   - Функции: Генерация и улучшение описаний тренеров, текстов анонсов, подписей к фото без AI-клише и воды.

---

## 2. Инфраструктура, сервера и доступы

### 2.1. Серверные параметры
- **Хост/Алиас SSH**: `tonivecher-new`
- **IP-адрес**: `95.85.254.72`
- **Пользователь**: `root`
- **Hostname**: `tonivecher.intezio.net`
- **SSH подключение**:
  ```bash
  ssh tonivecher-new
  ```
  *(Используются стандартные ключи macOS/Linux пользователя, настроенные в `~/.ssh/config`)*.

### 2.2. Размещение файлов на сервере
| Назначение | Путь на сервере |
| :--- | :--- |
| **Фронтенд (production build)** | `/var/www/avalon.tonivecher.online/current/` |
| **Бэкенд и Telegram-бот** | `/opt/avalon-bot/` |
| **Конфигурационный файл окружения** | `/opt/avalon-bot/.env` |
| **База данных контента сайта** | `/opt/avalon-bot/server/data/content.json` |
| **Список ID администраторов бота** | `/opt/avalon-bot/server/data/admins.json` |
| **Хранилище загруженных фото** | `/opt/avalon-bot/server/uploads/` и `/opt/avalon-bot/public/uploads/` |
| **Конфигурация Nginx** | `/etc/nginx/conf.d/avalon.tonivecher.online.conf` |
| **SSL-сертификаты** | `/etc/letsencrypt/live/avalon.tonivecher.online/` |
| **Systemd-сервис** | `/etc/systemd/system/avalon-bot.service` |

### 2.3. Конфигурация Nginx
Файл: `/etc/nginx/conf.d/avalon.tonivecher.online.conf`:
- Порт `80` редиректит весь трафик на HTTPS.
- Порт `127.0.0.1:8443` слушает HTTPS трафик (маршрутизируется через `/etc/nginx/stream-conf.d/tls-router.conf` с SNI `avalon.tonivecher.online`).
- Локейшены:
  - `/` — статика из `/var/www/avalon.tonivecher.online/current/` с SPA fallback `try_files $uri $uri/ /index.html;`.
  - `/api/` — проксирует на `http://127.0.0.1:3018`.
  - `/uploads/` — проксирует на `http://127.0.0.1:3018`.
  - `/health` — проксирует на `http://127.0.0.1:3018`.
  - Статические ассеты (`css`, `js`, `images`) кэшируются с заголовками `Cache-Control: public, immutable`.

### 2.4. Systemd-сервис бэкенда
Файл: `/etc/systemd/system/avalon-bot.service`:
```ini
[Unit]
Description=Avalon Dance Club Telegram Bot and Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/avalon-bot
ExecStart=/usr/local/bin/bun run server/bot.ts
Restart=always
RestartSec=5
EnvironmentFile=/opt/avalon-bot/.env

StandardOutput=journal
StandardError=journal
SyslogIdentifier=avalon-bot

[Install]
WantedBy=multi-user.target
```

Управление сервисом:
```bash
ssh tonivecher-new 'systemctl restart avalon-bot.service'
ssh tonivecher-new 'systemctl status avalon-bot.service'
ssh tonivecher-new 'journalctl -u avalon-bot.service -f -n 50'
```

---

## 3. Переменные окружения (`.env`)

Файл расположен в `/opt/avalon-bot/.env` на сервере и в корне локального репозитория.

| Переменная | Назначение | Пример / Описание |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Токен бота Telegram от `@BotFather` | `123456789:ABCdefGHI...` |
| `TELEGRAM_CHANNEL_USERNAME` | Юзернейм официального канала | `dusha_avalon` |
| `TELEGRAM_CHANNEL_ID` | ID канала с префиксом `-100` | `-1002188408014` |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat ID главного админа для заявок | `6014428402` |
| `ADMIN_SECRET_KEY` | Секретный пароль для команды `/auth` | `avalon_coach_2026` |
| `PORT` | Порт HTTP API сервера | `3018` |
| `AI_API_BASE` | URL прокси для OpenAI/Gemini API | `http://127.0.0.1:8045/v1` (по умолчанию) |
| `AI_MODEL` | Модель генерации текста | `gemini-2.5-flash` |
| `AI_API_KEY` | Ключ доступа к AI | Если не указан, автоматически берется из `/opt/antigravity-manager/data/gui_config.json` |

---

## 4. Администраторы и управление доступом

### 4.1. Текущие администраторы бота
Список хранится в JSON-файле `server/data/admins.json`. В него входят:
- `6014428402` (основной администратор / владелец)
- `1892394649` (педагог / наставник)
- `5213715303` (педагог / наставник)

### 4.2. Как добавить нового администратора
**Способ 1 (через бота без перезапуска):**
1. Новый пользователь открывает бота `@dusha_avalon_bot`.
2. Отправляет команду:
   ```text
   /auth avalon_coach_2026
   ```
   *(если в `.env` задан другой `ADMIN_SECRET_KEY`, использовать его)*.
3. Бот добавит его ID в `admins.json` и откроет главное меню управления клубом.

**Способ 2 (напрямую в файл на сервере):**
1. Отредактировать `/opt/avalon-bot/server/data/admins.json`.
2. Добавить строку с ID пользователя: `["6014428402", "1892394649", "5213715303", "НОВЫЙ_ID"]`.
3. Перезапустить сервис: `ssh tonivecher-new 'systemctl restart avalon-bot.service'`.

---

## 5. Структура локального репозитория (`/Users/hozain/АВАЛОН`)

```text
/Users/hozain/АВАЛОН
├── index.html                   # Корневой HTML с предзагрузкой шрифтов Cormorant Garamond и Plus Jakarta Sans
├── package.json                 # Зависимости: react 19, tailwindcss 4, grammy, lucide-react
├── tsconfig.json                # Конфигурация TypeScript
├── vite.config.ts               # Конфигурация сборщика Vite
├── HANDOVER_GUIDE.md            # Данный передаточный документ
│
├── src/                         # Исходный код фронтенда
│   ├── App.tsx                  # Главный корневой компонент приложения
│   ├── main.tsx                 # Точка входа React
│   ├── index.css                # Токены дизайн-системы Tailwind v4, double-bezel, hairline borders
│   ├── components/              # Компоненты сайта
│   │   ├── Header.tsx           # Островная шапка (логотип, навигация без иконочного спама, кнопка)
│   │   ├── Hero.tsx             # Главный экран Усадьбы (монументальный заголовок, фактоиды 1713 г.)
│   │   ├── PhotoBento.tsx       # Бенто-сетка фотографий и побед из канала клуба
│   │   ├── UsadbaGallery.tsx    # Монография бального зала Усадьбы Свиблово и парка
│   │   ├── LiveSchedule.tsx     # Интерактивная сетка расписания по дням недели и направлениям
│   │   ├── CoachesSection.tsx   # Портретная галерея наставников с музейным обрамлением
│   │   ├── QuickLeadForm.tsx    # Форма записи на пробный урок в стиле клубного билета
│   │   └── Footer.tsx           # Монолитный подвал сайта с контактами и реквизитами
│   └── data/
│       ├── clubData.ts          # Резервные статичные данные, пути к фото и дефолтное расписание
│       └── useClubContent.ts    # React-хук с SWR: опрашивает /api/content и обновляет стейт
│
├── server/                      # Исходный код бэкенда и Telegram-бота
│   ├── bot.ts                   # Серверное приложение: grammY бот, автосинк канала, Bun HTTP API
│   ├── contentStore.ts          # CRUD-логика, валидация схемы данных, чтение/запись content.json
│   ├── aiService.ts             # Клиент OpenAI/Gemini API для умной генерации описаний
│   └── data/                    # Локальные данные для разработки
│       ├── content.json         # Актуальное состояние контента сайта
│       └── admins.json          # Список ID админов
│
└── public/                      # Статические файлы, логотипы и изображения
    ├── favicon.png
    ├── apple-touch-icon.png
    └── images/
        ├── club/                # Логотипы (вектор/PNG) и фото из канала
        └── usadba/              # Исторические кадры усадьбы Свиблово
```

---

## 6. Как работает синхронизация данных

### 6.1. Жизненный цикл данных
```
+-----------------------------+           +--------------------------+
|  Telegram Канал             |           | Telegram Бот             |
|  @dusha_avalon              |           | @dusha_avalon_bot        |
|  (посты тренеров с фото)    |           | (кнопочная админка)      |
+--------------+--------------+           +------------+-------------+
               |                                       |
               | channel_post event                    | inline keyboard edits
               v                                       v
+--------------------------------------------------------------------+
|                server/bot.ts (Bun / grammY)                        |
|   - Загрузка оригиналов фото в /uploads/                          |
|   - Генерация текстов через server/aiService.ts (Gemini Flash)    |
|   - Запись в server/data/content.json                             |
+---------------------------------+----------------------------------+
                                  |
                                  | HTTP GET /api/content
                                  v
+--------------------------------------------------------------------+
|               Публичный сайт avalon.tonivecher.online              |
|   - useClubContent.ts (SWR опрос каждые 15 сек)                    |
|   - Мгновенное обновление Hero, Бенто, Расписания и Тренеров       |
+---------------------------------+----------------------------------+
                                  |
                                  | Пользователь оставляет заявку
                                  v POST /api/leads
+--------------------------------------------------------------------+
|   Мгновенное уведомление в Telegram всем админам из admins.json    |
+--------------------------------------------------------------------+
```

### 6.2. Структура `content.json`
Файл содержит 5 основных разделов:
1. `hallStatus`: `{ status: string, announcement: string, updatedAt: string }` — статус работы зала.
2. `announcements`: массив анонсов `{ id, title, text, tag, date, photo, active, source }`.
3. `coaches`: массив наставников `{ id, name, role, badge, desc, photo, specs, order }`.
4. `schedule`: объект с ключами 0..6 (дни недели): `{ dayName, shortName, items: [...], announcement }`.
5. `gallery`: массив карточек галереи `{ id, title, caption, badge, category, photo, order }`.

---

## 7. Регламент сборки и деплоя

### 7.1. Сборка и деплой фронтенда
При внесении любых правок в интерфейс (в `src/`):

```bash
# 1. Перейти в каталог проекта
cd /Users/hozain/АВАЛОН

# 2. Собрать production-билд
bun run build

# 3. Синхронизировать с боевым сервером
rsync -avz --delete dist/ tonivecher-new:/var/www/avalon.tonivecher.online/current/

# 4. Проверить HTTP-код и заголовки
curl -I https://avalon.tonivecher.online
```

### 7.2. Деплой изменений бэкенда или бота
При изменении файлов в `server/` (`bot.ts`, `contentStore.ts`, `aiService.ts`):

```bash
# 1. Перейти в каталог проекта
cd /Users/hozain/АВАЛОН

# 2. Синхронизировать файлы server/ (исключая локальные данные и uploads)
rsync -avz --exclude 'data' --exclude 'uploads' server/ tonivecher-new:/opt/avalon-bot/server/

# 3. Перезапустить сервис на сервере
ssh tonivecher-new 'systemctl restart avalon-bot.service'

# 4. Проверить статус и логи
ssh tonivecher-new 'systemctl status avalon-bot.service --no-pager'
ssh tonivecher-new 'journalctl -u avalon-bot.service -n 25 --no-pager'
```

---

## 8. Пошаговые сценарии для разработчиков

### Сценарий 1: Изменить или добавить информацию о наставнике
- **Через Telegram-бота (рекомендуется для тренеров):**
  1. Зайти в `@dusha_avalon_bot` → Нажать «👥 Наставники клуба».
  2. Выбрать наставника из списка или нажать «➕ Добавить наставника».
  3. Бот покажет фото, текст и инлайн-кнопки: «Изменить имя», «Изменить описание», «Заменить фото», «✨ AI Улучшить описание».
  4. Изменения моментально отобразятся на сайте.
- **Напрямую через код/JSON:**
  Отредактировать `server/data/content.json` на сервере или файл `src/data/clubData.ts` (как дефолтный резерв).

### Сценарий 2: Добавить новое занятие в расписание
- **Через Telegram-бота:**
  1. Нажать «📅 Расписание занятий» → Выбрать день недели (например, Среда).
  2. Нажать «➕ Добавить занятие».
  3. Ввести время (например, `17:00 – 18:00`), название, наставника и категорию.
- **Через JSON:**
  В `/opt/avalon-bot/server/data/content.json` в секции `schedule[день].items` добавить элемент.

### Сценарий 3: Добавить пост или фото в галерею
- **Через Telegram-канал клуба:**
  Просто опубликовать фото с подписью в канале `@dusha_avalon`. Бот перехватит пост, сохранит фото и выставит его на сайт.
- **Через бота:**
  Нажать «🖼 Галерея и победы» → «➕ Добавить фото» → отправить фото боту в чат.

### Сценарий 4: Настройка AI-генерации текстов (Gemini)
Если на сервере изменился порт прокси или API-ключ:
1. Открыть `/opt/avalon-bot/.env`.
2. Задать:
   ```env
   AI_API_BASE=http://127.0.0.1:8045/v1
   AI_MODEL=gemini-2.5-flash
   AI_API_KEY=твой_ключ
   ```
3. Перезапустить бота: `systemctl restart avalon-bot.service`.

---

## 9. Диагностика и устранение неполадок (Troubleshooting)

1. **Сайт отдает 502 Bad Gateway при отправке формы или обращении к `/api/content`**:
   - Причина: Сервис `avalon-bot.service` остановлен или упал из-за синтаксической ошибки.
   - Проверка: `ssh tonivecher-new 'systemctl status avalon-bot.service'`.
   - Логи ошибки: `ssh tonivecher-new 'journalctl -u avalon-bot.service -n 50 --no-pager'`.
   - Перезапуск: `ssh tonivecher-new 'systemctl restart avalon-bot.service'`.

2. **Бот в Telegram не отвечает на команды**:
   - Проверить, запущен ли сервис: `systemctl status avalon-bot.service`.
   - Проверить валидность токена в `/opt/avalon-bot/.env` (`TELEGRAM_BOT_TOKEN`).
   - Убедиться, что не запущено две копии бота (conflict `getUpdates 409 Conflict`).

3. **Стили на сайте не обновились после деплоя**:
   - Браузер закешировал старый HTML/CSS.
   - Проверить хэши ассетов на сервере: `ls -la /var/www/avalon.tonivecher.online/current/assets/`.
   - Очистить кэш браузера (Cmd+Shift+R) или проверить в режиме инкогнито.

4. **Заявка с сайта не приходит в Telegram**:
   - Проверить `TELEGRAM_ADMIN_CHAT_ID` в `/opt/avalon-bot/.env` и `admins.json`.
   - Убедиться, что администратор запустил бота (нажал `/start`), иначе Telegram запрещает боту писать первым.

---

Документ подготовлен для беспрепятственной передачи проекта любому разработчику или AI-агенту.
Все компоненты проверены и функционируют в штатном режиме.
