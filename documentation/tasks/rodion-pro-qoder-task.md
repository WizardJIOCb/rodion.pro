# Qoder Task: rodion.pro — починка DB/Changelog + “Последние события” + полировка контента/UX

## 0) Текущее положение дел (диагностика по исходникам)

### Что уже хорошо
- Astro SSR (standalone node) + Tailwind, аккуратные компоненты.
- i18n `/ru/*` и `/en/*`, темы, блог (content collection), командная палитра.
- Заложены community‑фичи (Google OAuth, сессии, комментарии/реакции, модерация).
- Заложены events/changelog (таблица `events`, вебхук GitHub, endpoint `/api/feed`).

### Что прямо сейчас критично ломает продукт
1) **DB-фичи падают из‑за отсутствия DATABASE_URL в проде**
   - `src/db/index.ts` делает `throw new Error('DATABASE_URL ...')` на import.
   - В `ecosystem.config.cjs` **не подхватывается `.env`** (только NODE_ENV/PORT), поэтому в проде `DATABASE_URL` почти наверняка пустой.
   - Итог: любые страницы/эндпоинты, которые импортят `@/db`, могут отдавать 500 (changelog, auth, comments, reactions, moderation, webhooks и т.д.).

2) **Главная: блок “Последние события” — заглушка**
   - `src/pages/ru/index.astro` / `src/pages/en/index.astro` содержат текст “после подключения к базе данных”.

3) **Страницы `/now` и `/resume` частично заглушки**
   - `src/pages/*/now.astro` и `src/pages/*/resume.astro` содержат “Контент будет добавлен” / “Information will be added”.

4) **RU‑навигация частично на английском**
   - `src/i18n/index.ts`: `nav.changelog`, `nav.now`, `nav.uses` сейчас “Changelog/Now/Uses” в RU.

## 1) Цели (что сделать)

### P0 (горячая починка)
- Сайт должен **стабильно работать даже если DB не настроена**: вместо 500 показывать понятные сообщения, а API отдаёт корректные коды/JSON.
- В проде должны нормально подхватываться переменные окружения (как минимум `DATABASE_URL`, OAuth secrets, webhook secrets).

### P1 (функционал)
- Реально вывести “Последние события” на главной (из таблицы `events`) + ссылка на `/changelog`.
- Починить `/changelog` так, чтобы не было 500 и была адекватная деградация.

### P2 (контент/UX полировка)
- Убрать “заглушки” на `/now` и `/resume` (хотя бы через управляемые данные).
- Привести RU‑переводы навигации в порядок.
- Добавить человеческие сообщения об ошибках для реакций/комментариев, если API недоступен.

---

## 2) План работ (конкретные задачи)

## A) Прод: правильная загрузка env (обязательно)
**Проблема:** pm2 запускает Node без env vars; `.env` сам по себе Node не читает.

### Вариант 1 (рекомендуется): PM2 `env_file`
1) В `ecosystem.config.cjs` добавить:
```js
env_file: '/var/www/rodion.pro/.env',
```
(или относительный `.env`, если pm2 запускается из `cwd` корректно).

2) Документировать: на сервере должен существовать `/var/www/rodion.pro/.env` со всеми переменными:
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `DEPLOY_TOKEN`
- `ADMIN_EMAILS`
- (опционально Turnstile)

**Acceptance criteria**
- `pm2 restart rodion-pro` поднимает процесс, в логах нет “DATABASE_URL is not set”.
- DB‑эндпоинты и changelog не 500.

### Вариант 2: dotenv на старте Node (если env_file нельзя)
1) Добавить зависимость `dotenv`.
2) Изменить `package.json`:
```json
"start": "node --import dotenv/config ./dist/server/entry.mjs"
```
3) Убедиться, что `.env` лежит рядом с `package.json`.

---

## B) Сделать DB‑слой безопасным (чтобы import не валил весь SSR)
**Файлы:** `src/db/index.ts` + новые хелперы.

### Изменения
1) Убрать `throw` при отсутствии `DATABASE_URL`.
2) Экспортировать:
- `db` как `null | drizzleInstance`
- `hasDb(): boolean`
- `requireDb(): drizzleInstance` (кидает ошибку при отсутствии, но вызывается **внутри try/catch**)

Пример (идея):
```ts
const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL;
let db: ReturnType<typeof drizzle> | null = null;

if (url) { ... init ... } else { console.warn('[db] DATABASE_URL missing'); }

export { db };
export const hasDb = () => !!db;
export const requireDb = () => {
  if (!db) throw new Error('DB not configured');
  return db;
};
```

**Acceptance criteria**
- Проект запускается и рендерит страницы даже без `DATABASE_URL`.
- Никаких 500 “на import”, только controlled errors.

---

## C) Починить Changelog (страница /ru/changelog и /en/changelog)
**Файлы:** `src/pages/ru/changelog.astro`, `src/pages/en/changelog.astro`

### Изменения
1) Заменить прямое использование `db` на `requireDb()` внутри try/catch.
2) Если DB нет — показывать красивую карточку:
- “Changelog недоступен: база данных не настроена”
- Кнопка/линк на GitHub репозиторий (если хочешь).
3) Если DB есть, но пусто — как сейчас: “No events yet...”.

**Acceptance criteria**
- `/ru/changelog` и `/en/changelog` не дают 500 ни при каком сценарии.
- При отсутствии DB — понятное сообщение вместо белого экрана.

---

## D) Реальные “Последние события” на главной (замена заглушки)
**Файлы:** `src/pages/ru/index.astro`, `src/pages/en/index.astro`

### Изменения (SSR‑вариант, без лишних fetch)
1) В frontmatter:
- попытаться загрузить 5–7 последних событий через `requireDb()` в try/catch
- при ошибке/отсутствии DB выставить флаг `eventsUnavailable`
2) В UI:
- если есть события → вывести список (можно переиспользовать `EventCard`, либо сделать компактный `EventMiniCard.astro`)
- если нет DB → показать короткую карточку “События появятся после настройки базы данных” (как сейчас, но без “заглушки навсегда”).

**Acceptance criteria**
- На главной отображаются последние события, если они есть в DB.
- Если DB не настроена — не 500, а нейтральная карточка.

---

## E) Привести API к нормальному поведению при отсутствии DB
**Файлы:** `src/pages/api/**` и `src/lib/session.ts`

### Требование
- Никаких “import crash”.
- Единый ответ:
  - если DB нужна, но не настроена → `503` JSON `{ error: "DB not configured" }`
  - если можно деградировать → вернуть пустой результат (например `/api/auth/me` → `{ user: null }`)

### Минимальный набор правок
1) `src/lib/session.ts`
   - если `!hasDb()` → вернуть `null` (не кидать исключение)

2) `src/pages/api/auth/logout.ts`
   - если DB нет → просто удалить cookie и вернуть 200 (или 204)

3) `src/pages/api/auth/google/callback.ts`
   - если DB нет → 503 + понятный текст (“Auth backend not configured”)

4) `src/pages/api/comments/*` и `src/pages/api/reactions/*`, `src/pages/api/feed.ts`
   - если DB нет → 503 JSON error

5) `src/pages/api/webhooks/github.ts` и `src/pages/api/events/deploy.ts`
   - если DB нет → 503 (webhook accepted? лучше 503 чтобы ретраили)
   - секреты/токены отсутствуют → 500 с понятным сообщением (как сейчас, но без падения import)

**Acceptance criteria**
- Все API endpoints отвечают предсказуемо (200/401/403/503) и не падают 500 из‑за импорта.

---

## F) UX: ошибки комментариев/реакций (не молча)
**Файлы:** `src/components/CommentsThread.tsx`, `src/components/ReactionsBar.tsx`

### Изменения
1) Добавить `error` state.
2) Если `/api/comments` или `/api/reactions` вернули не‑OK или fetch упал:
   - показать компактную подсказку:
     - RU: “Комментарии временно недоступны (backend не настроен).”
     - EN: “Comments are temporarily unavailable (backend not configured).”
3) Не ломать остальную страницу.

---

## G) Убрать заглушки на /now и /resume (без “большого редактора”)
**Файлы:** `src/pages/*/now.astro`, `src/pages/*/resume.astro` (+ новый data слой)

### Предлагаю сделать так (удобно править без лезвия в верстку):
1) Создать `src/data/now.ts` и `src/data/resume.ts` с экспортом структур:
- массив секций, пункты, ссылки, даты.
2) На страницах рендерить данные из этих файлов.

**Acceptance criteria**
- На /now и /resume нет текста “Контент будет добавлен”.
- Контент правится через `src/data/*.ts` без правки верстки.

---

## H) i18n полировка (RU термины)
**Файл:** `src/i18n/index.ts`

### Изменения (пример)
- `nav.changelog`: “Журнал изменений” (или “Изменения”)
- `nav.now`: “Сейчас”
- `nav.uses`: “Инструменты” (или “Setup”/“Сетап” если хочешь стиль)
- `nav.contact`: лучше “Контакты”

Проверить, чтобы в Header/меню всё стало на русском.

---


---

## I) UI: “умная” подсветка рамки карточек (Projects / News / любые панели)

**Задача:** сделать эффект наведения на панели/карточки: рамка подсвечивается **локально в той зоне**, где находится курсор (ближе к конкретному краю), и красиво **переливается** при движении мыши “по кругу” по граням. Должно работать на множестве карточек одновременно (каждая реагирует независимо).

### Где применить
- Карточки проектов (Projects list + featured проекты на главной)
- Карточки новостей/постов (если есть список)
- Любые “панели” типа Stats / Events / Hero blocks (по желанию, но минимум — Projects + Events/News)

### Визуальные требования
- По умолчанию: тонкая нейтральная рамка/обводка.
- На hover: появляется **свечение/акцент** **только у ближайшего края** (top/right/bottom/left), не по всему периметру.
- При движении курсора вдоль рамки: акцент “едет” за курсором и делает мягкий перелив.
- Должно быть уместно в твоём terminal/neon стиле (без кислотной радуги), аккуратно.

### Техническая реализация (рекомендованный вариант)
Сделать универсальный компонент-обёртку **HoverEdgeGlow** (Astro компонент или TS/JS утилита), который:
1) На `pointermove` внутри карточки вычисляет:
   - координаты курсора относительно карточки: `x`, `y`
   - расстояния до краёв: `dt = y`, `dr = w - x`, `db = h - y`, `dl = x`
   - ближайший край `edge = argmin(dt, dr, db, dl)`
2) Устанавливает CSS variables на элементе карточки:
   - `--mx: x` (px)
   - `--my: y` (px)
   - `--edge: 0|1|2|3` (top/right/bottom/left)
3) В CSS через `::before` рисует подсвеченную рамку:
   - фон: **conic-gradient** (или linear-gradient) с центром в точке курсора
   - маска: чтобы был виден только “бордер” (mask-composite / padding-box trick)
   - дополнительно: в зависимости от `--edge` показывать **только часть** бордера (например, через clip-path или через 4 отдельных слоёв с opacity)

#### Вариант А (быстрее и красиво): conic-gradient + masked border
- `::before` покрывает весь элемент, но виден только бордер.
- Цвет/интенсивность “собирается” вокруг точки курсора.
- Ограничение “только ближайший край” достигается:
  - либо `clip-path` прямоугольником на 25–35% от периметра вдоль выбранного edge,
  - либо 4 слоя (top/right/bottom/left) и включаем один через `opacity`.

#### Вариант Б (максимально контролируемо): 4 слоя по краям
- Создать 4 псевдо-элемента/вложенных элемента для граней, и подсвечивать только один:
  - top: `height: 2px; left: 8px; right: 8px; top: 0`
  - right: `width: 2px; top: 8px; bottom: 8px; right: 0`
  - bottom / left аналогично
- Градиент вдоль активной грани зависит от `--mx/--my` (позиция курсора) → получается “едет за мышью”.

### Производительность
- Использовать `requestAnimationFrame` (throttle) на обновление CSS variables.
- Слушатели вешать на карточки по `data-hover-glow` (querySelectorAll).
- На `pointerleave` — сбрасывать интенсивность (например `--glow: 0`).

### Файлы/структура
- Добавить CSS:
  - `src/styles/hover-edge-glow.css` (или в глобальный Tailwind layer)
- Добавить JS утилиту:
  - `src/lib/ui/hoverEdgeGlow.ts` (инициализация: `initHoverEdgeGlow()` в layout/entry)
- Обновить компоненты карточек:
  - `ProjectCard.astro`, `EventCard.astro` / списки на главной → добавить `data-hover-glow` + классы.

### Acceptance criteria
- На списке проектов при наведении свечение появляется **у ближайшего края** и “едет” при движении мыши вдоль рамки.
- На нескольких карточках эффект работает независимо.
- На мобильных/тач-устройствах ничего не ломается (можно отключить по `pointer: coarse`).
- Безопасно при отключённом JS: остаётся обычная рамка без свечения.

### Дополнительно (опционально, если успеют)
- Добавить параметр интенсивности/цвета через классы (`data-glow="teal|gold|purple"`).
- Учитывать тему (dark/light) и не перебивать читаемость.


## 3) Тест‑план (обязателен перед деплоем)
1) **Без DB**:
   - удалить/не задавать `DATABASE_URL`
   - `npm run build && npm run start`
   - открыть:
     - `/ru/`, `/en/`
     - `/ru/changelog` → не 500, карточка “DB not configured”
     - `/api/auth/me` → 200 `{ user: null }` (или 503, если решите иначе)
     - `/api/comments?...` → 503 JSON error (и UI показывает сообщение)

2) **С DB**:
   - поднять Postgres, прогнать `drizzle/0001_initial.sql`
   - задать `DATABASE_URL`
   - открыть `/ru/changelog` (0 событий → “No events yet”)
   - отправить тестовый webhook (или вручную вставить event) → увидеть события на главной и в changelog.

---

## 4) Ожидаемые коммиты (чтобы Qoder делал аккуратно)
1) `fix(env): load .env in pm2 (env_file) + docs`
2) `refactor(db): make db optional + requireDb/hasDb helpers`
3) `fix(changelog): graceful fallback when db missing`
4) `feat(home): show recent events on homepage`
5) `fix(api): return 503 when db missing; session safe`
6) `ux: show comments/reactions error banner`
7) `content: move now/resume content to data files`
8) `i18n: translate RU nav labels`

---

## 5) Примечания (важно)
- Сейчас в архиве лежит `node_modules` и `dist`. В репозитории лучше не хранить их (но это опционально).
- Если ты не хочешь режим “без DB”, всё равно **не надо throw на import** — лучше controlled error и понятное сообщение.

