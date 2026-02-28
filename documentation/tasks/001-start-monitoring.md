# ТЗ для Qoder: rodion.pro — Live Activity (онлайн-учёт активности ПК + дашборд)

## 0) Контекст и цель
Нужно сделать на **rodion.pro** приватную страницу **/activity**, которая **в реальном времени** показывает мою текущую активность на основном ПК (программирование/развлечения) и статистику по времени.

**Ключевое:** это НЕ кейлоггер. Никакого текста, никаких паролей, никаких URL, никаких заголовков окон по умолчанию. Только агрегаты и категории.

---

## 1) Что должно получиться в итоге (Deliverables)
### 1.1 На rodion.pro
1) Backend-сервис (Node.js) с эндпоинтами:
- `POST /api/activity/v1/ingest` — приём телеметрии с ПК
- `GET  /api/activity/v1/now` — текущее состояние (последние данные)
- `GET  /api/activity/v1/stats` — статистика по диапазону (по часам/дням), разрез по приложениям/категориям
- `GET  /api/activity/v1/stream` — SSE stream для live обновления UI (private)
- `GET  /api/activity/v1/public` — публичный “safe” view (только категории, без app names)

2) Страница **/activity** (приватная) с live UI:
- “Now”: что сейчас (категория, приложение опционально), AFK/active, last update
- “Сегодня по часам”: активность по часам
- “Top apps / top categories today”
- “Last 7 / 30 days” тренды
- фильтры по диапазону времени и (опционально) по устройству

3) Страница **/activity/public** (публичная, безопасная):
- “Rodion: coding / entertainment / idle” + “last seen”
- today totals по категориям (без конкретных приложений, без заголовков, без url)
- по желанию: общий счётчик keys/clicks за день (без разреза по приложениям)

4) PostgreSQL схема + миграции (Drizzle или любая принятая в проекте миграционная система)

5) Nginx конфиг (location proxy) + PM2/systemd запуск сервиса

### 1.2 На моём ПК (Windows)
Отдельная утилита **activity-agent** (Node.js TS или Python), которая:
- получает “что сейчас активно” + AFK/idle + счётчики input (keys/clicks/scroll) **без содержимого**
- агрегирует и раз в 5–10 секунд отправляет на сервер в `/api/activity/v1/ingest`
- имеет конфиг приватности (blacklist apps, categoriesOnly, anonymize)
- буферизует данные при офлайне и догружает потом

---

## 2) Архитектура (MVP, рекомендовано)
### 2.1 Источник данных на ПК: ActivityWatch (локально) + watchers
Ставим ActivityWatch локально и используем:
- `aw-watcher-window` (активное приложение/окно)
- `aw-watcher-afk` (idle/AFK)
- `aw-watcher-input` (счётчики нажатий/мыши без текста)

Документация (для Qoder, чтобы сверить API/схемы):
- https://docs.activitywatch.net/en/latest/watchers.html
- https://docs.activitywatch.net/en/latest/api/rest.html
- https://github.com/ActivityWatch/aw-watcher-input

⚠️ Важно: **НЕ тащить на сервер window title / url**. Даже если watcher отдаёт — игнорировать.

### 2.2 Agent (activity-agent) читает ActivityWatch REST API
Agent каждые N секунд:
1) определяет активное приложение (process/app) и AFK
2) считает input за интервал (keys/clicks/scroll)
3) применяет privacy rules
4) шлёт батч на rodion.pro

---

## 3) Приватность и безопасность (обязательные требования)
### 3.1 Что запрещено собирать/хранить/отправлять
- какие именно клавиши нажаты, текст, буфер обмена
- заголовки окон (title)
- URL/домены/вкладки браузера
- содержимое экрана/скриншоты
- имена файлов/пути (если вдруг всплывают)

### 3.2 Что разрешено (минимальный набор)
- активность по времени (секунды активности/AFK)
- имя процесса/приложения (например `code.exe`, `chrome.exe`) **только в private режиме**
- категория (coding / entertainment / comms / system / unknown)
- агрегированные counters: keys/clicks/scroll за интервал

### 3.3 Защита /activity и API
- `/activity` и private API (`/api/activity/v1/*` кроме public) должны быть **закрыты**:
  - вариант A: Nginx Basic Auth
  - вариант B: app-level auth (admin token в header/cookie)
- ingest защищён ключом устройства:
  - `X-Device-Id` + `X-Device-Key` (ключ хранить в БД хешем)
  - rate-limit (напр. 1 req / 2 sec на device)
  - body size limit (например 32 KB)

---

## 4) Контракт данных (Server API)
### 4.1 Ingest
`POST /api/activity/v1/ingest`

Headers:
- `X-Device-Id: pc-main`
- `X-Device-Key: <secret>`

Body (пример):
json
{
  "sentAt": "2026-02-28T12:34:56.000Z",
  "intervalSec": 10,
  "now": {
    "app": "code.exe",
    "category": "coding",
    "isAfk": false
  },
  "counts": {
    "keys": 42,
    "clicks": 3,
    "scroll": 5
  }
}

Примечание (MVP):

counts можно привязывать к текущему now.app как “приблизительно”. Позже можно сделать более точное распределение по времени.

Response:

200 { "ok": true }

4.2 Now (private)

GET /api/activity/v1/now?deviceId=pc-main

Response:

{
  "deviceId": "pc-main",
  "updatedAt": "2026-02-28T12:34:56.000Z",
  "now": { "app": "code.exe", "category": "coding", "isAfk": false },
  "countsToday": { "keys": 12345, "clicks": 678, "scroll": 910 }
}
4.3 Stats (private)

GET /api/activity/v1/stats?deviceId=pc-main&from=2026-02-28T00:00:00Z&to=2026-02-29T00:00:00Z&tz=Europe/Berlin&group=hour

Response (пример):

{
  "from": "...",
  "to": "...",
  "group": "hour",
  "series": [
    { "t": "2026-02-28T10:00:00Z", "activeSec": 2400, "afkSec": 1200, "keys": 500, "clicks": 40, "scroll": 70 }
  ],
  "topApps": [
    { "app": "code.exe", "category": "coding", "activeSec": 14400, "keys": 8000, "clicks": 200, "scroll": 350 }
  ],
  "topCategories": [
    { "category": "coding", "activeSec": 18000 }
  ]
}
4.4 SSE Stream (private)

GET /api/activity/v1/stream?deviceId=pc-main

События:

event: now + JSON payload

UI обновляет карточки “Now” и “Today”.

4.5 Public safe

GET /api/activity/v1/public

Response:

{
  "status": "coding",
  "lastSeenAt": "2026-02-28T12:34:56.000Z",
  "today": {
    "categories": [
      { "category": "coding", "activeSec": 18000 },
      { "category": "entertainment", "activeSec": 3600 }
    ]
  }
}
5) БД (PostgreSQL) — минимальная схема
5.1 Таблицы
activity_devices

id TEXT PK (например pc-main)

name TEXT

api_key_hash TEXT

created_at TIMESTAMPTZ

last_seen_at TIMESTAMPTZ

activity_minute_agg

Minute aggregates (чтобы БД не пухла)

device_id TEXT FK

ts_minute TIMESTAMPTZ (округлённая до минуты)

app TEXT (nullable если categoriesOnly)

category TEXT

active_sec INT (0..60)

afk_sec INT (0..60)

keys INT

clicks INT

scroll INT

UNIQUE (device_id, ts_minute, app, category) — обсудить точный unique ключ (чтобы не плодить строки)

activity_now

device_id TEXT PK

updated_at TIMESTAMPTZ

app TEXT nullable

category TEXT

is_afk BOOL

counts_today JSONB (или отдельные колонки)

payload JSONB (минимально)

5.2 Retention

minute_agg хранить 180 дней (конфиг)

now хранить всегда (1 запись на device)

6) UI /activity (React + TS)
6.1 Компоненты

ActivityPage (route /activity)

NowCard

HourlyChart (today activeSec/keys)

TopAppsTable

TrendsChart (last7/last30)

FiltersBar

6.2 Обновление

SSE подключение на /api/activity/v1/stream

fallback: polling /now раз в 10 сек если SSE недоступен

6.3 Дизайн

шадцн/тейлвинд в стиле rodion.pro

“public-safe” режим должен быть отдельной страницей /activity/public с минимальным UI

7) Activity Agent (Windows) — требования реализации
7.1 Конфиг activity-agent.config.json
{
  "serverBaseUrl": "https://rodion.pro",
  "deviceId": "pc-main",
  "deviceKey": "SECRET",
  "pollIntervalSec": 10,
  "privacy": {
    "mode": "apps", 
    "blacklistApps": ["keepass.exe", "1password.exe"],
    "categoriesOnly": false,
    "anonymizeApps": false
  },
  "categories": [
    { "match": "code.exe|idea64.exe|webstorm64.exe", "category": "coding" },
    { "match": "chrome.exe|firefox.exe", "category": "browser" },
    { "match": "steam.exe|game.exe", "category": "entertainment" },
    { "match": "telegram.exe|discord.exe", "category": "comms" }
  ]
}
7.2 Логика (MVP)

берём “текущее активное приложение” (через ActivityWatch window watcher)

AFK (через ActivityWatch afk watcher)

input counts (через aw-watcher-input)

за интервал N секунд считаем delta и отправляем batched payload (см. ingest)

7.3 Устойчивость

локальный буфер (например файл/SQLite) на 24 часа при офлайне

повтор отправки с backoff

логирование + ротация

7.4 Автозапуск

скрипт установки Windows Scheduled Task (или bat + schtasks)

запуск при логине пользователя

8) Интеграция на сервере (Ubuntu + Nginx + PM2)
8.1 Nginx location (пример)
location /api/activity/ {
  proxy_pass http://127.0.0.1:4010/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_read_timeout 3600;
}
8.2 Сервис

порт: 4010

запуск: PM2 (pm2 start dist/server.js --name activity-service)

ENV:

DATABASE_URL=...

ACTIVITY_ADMIN_TOKEN=...

ACTIVITY_RETENTION_DAYS=180

ACTIVITY_REQUIRE_AUTH=true