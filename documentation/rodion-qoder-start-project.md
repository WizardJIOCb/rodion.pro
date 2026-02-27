# Qoder Spec: rodion.pro — Soft Cyberpunk Terminal Blog + Community (RU/EN) v1.1

Owner: Rodion (WizardJIOCb)  
Prod: https://rodion.pro (SSL настроен)  
Server: Ubuntu 24.04, nginx + postgres + node + docker уже стоят  
Resources: 4 vCPU / 8GB RAM / 80GB  
Workdir: /var/www/rodion.pro

---

## 0) Цель (в 1 строку)
Сделать личный сайт Rodion в стиле **мягкий киберпанк + терминальный вайб**, но **человечный и удобный** для обычного читателя, с RU/EN, блогом, проектами, auto-changelog и **сообществом**: комментарии + реакции почти без трения (Google OAuth в 1 клик, текст комментария не теряется).

---

## 1) MVP Features (обязательное)

### 1.1 i18n / маршруты
Структура с языковыми префиксами:
- `/ru`, `/en` — Home
- `/ru/projects`, `/en/projects`
- `/ru/changelog`, `/en/changelog` — события (авто)
- `/ru/blog`, `/en/blog`
- `/ru/blog/[slug]`, `/en/blog/[slug]`
- `/ru/now`, `/en/now`
- `/ru/resume`, `/en/resume`
- `/ru/contact`, `/en/contact`
- `/ru/uses`, `/en/uses` (можно считать MVP, очень полезная страница)

`/`:
- авто-редирект на `/ru` или `/en` по `Accept-Language`
- запоминать выбор в cookie `lang=ru|en`

### 1.2 UI: Terminal-style, но usable
- **Обычная навигация** (header меню + footer).
- Терминал = **визуальный hero-блок** (window frame + prompt lines), без “хакерской” каши.
- **Command Palette** (Ctrl+K / ⌘K) для переходов + быстрого поиска:
  - `help`, `projects`, `changelog`, `blog`, `now`, `resume`, `contact`
- Доступность:
  - читаемая типографика
  - контраст AA минимум
  - focus ring / keyboard nav / aria labels

---

## 2) Темы (палитры) и механизм theme switch (обязательное)

### 2.1 Требование
Заложить сразу несколько тем (палитр), с возможностью выбора читателем.
- По умолчанию: тёмная тема “Soft Neon Teal”
- Сохранять выбор в `localStorage` + учитывать `prefers-color-scheme`
- Должно быть легко оставить одну тему “в итоге” (но сейчас делаем поддержку нескольких).

### 2.2 Список тем (готовые палитры)
Использовать CSS variables (Design Tokens). Каждая тема — набор переменных:

#### Theme A — Soft Neon Teal (default)
- bg: `#0B0F14`
- surface: `#111823`
- surface2: `#0F1620`
- text: `#E7EEF7`
- muted: `#A7B3C2`
- border: `#243244`
- accent: `#38E8D6`
- accent2: `#8B7CFF`
- glow: `rgba(56,232,214,0.18)`
- danger: `#FF4D6D`
- success: `#2FE38C`
- warn: `#FFB020`

#### Theme B — Violet Rain
- bg: `#0A0612`
- surface: `#130D21`
- surface2: `#0F0A1A`
- text: `#F2EEFF`
- muted: `#B9ADD6`
- border: `#2B1F45`
- accent: `#B066FF`
- accent2: `#39D0FF`
- glow: `rgba(176,102,255,0.16)`
- danger: `#FF4B7A`
- success: `#35E39B`
- warn: `#FFC14A`

#### Theme C — Amber Terminal (теплее, “ретро-терминал”)
- bg: `#0D0B08`
- surface: `#15110C`
- surface2: `#110E0A`
- text: `#FFF1D6`
- muted: `#CBB999`
- border: `#2A2218`
- accent: `#FFB74A`
- accent2: `#36E2D6`
- glow: `rgba(255,183,74,0.14)`
- danger: `#FF5A6A`
- success: `#34E08B`
- warn: `#FFD56A`

#### Theme D — Ice Cyan (холодная “кибер-лаборатория”)
- bg: `#071017`
- surface: `#0E1A24`
- surface2: `#0B1620`
- text: `#E9F7FF`
- muted: `#A7C0CC`
- border: `#1F3442`
- accent: `#46E4FF`
- accent2: `#6CFFB6`
- glow: `rgba(70,228,255,0.16)`
- danger: `#FF4D7D`
- success: `#2FE38C`
- warn: `#FFC85A`

#### Theme E — Mono Green (минимал “green terminal” без кислотности)
- bg: `#070B07`
- surface: `#0F150F`
- surface2: `#0B100B`
- text: `#E7FFE7`
- muted: `#A5C0A5`
- border: `#1D2B1D`
- accent: `#55F27D`
- accent2: `#38E8D6`
- glow: `rgba(85,242,125,0.12)`
- danger: `#FF4B6E`
- success: `#55F27D`
- warn: `#FFD06A`

### 2.3 Реализация тем
- `<html data-theme="soft-neon-teal">`
- Tailwind: базовые цвета через CSS variables:
  - `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent2`, `--danger`, `--success`, `--warn`, `--glow`
- Компонент `ThemeSwitch` в header (иконка + dropdown).
- Лёгкие glow-эффекты: только на акцентах (кнопки, hero, focus), без “светящегося всего”.

---

## 3) Контент (Git-based, RU/EN)

### 3.1 Blog posts (MDX)
- `src/content/blog/ru/*.mdx`
- `src/content/blog/en/*.mdx`

Frontmatter:
```yaml
title: "..."
description: "..."
date: "2026-02-25"
tags: ["ai","devops"]
draft: false
hero: "/images/optional"
3.2 Static pages (MDX)

src/content/pages/ru/now.mdx, resume.mdx, contact.mdx, uses.mdx

src/content/pages/en/...

3.3 Projects (semi-static + translations)

src/data/projects.ts:

export type Project = {
  id: string;
  title: { ru: string; en: string };
  tagline: { ru: string; en: string };
  status: "active" | "paused" | "archived";
  links: { site?: string; github?: string; demo?: string };
  stack: string[];
  highlights: { ru: string[]; en: string[] };
};
4) Community: комментарии + реакции + быстрый вход (обязательное)
4.1 Основной принцип “без трения”

Читатель может сразу начать писать комментарий.
Когда нажимает “Отправить”:

если он не авторизован, открывается модалка “Continue with Google (1 click)”,

текст комментария не теряется (сохраняется в localStorage как draft),

после OAuth возвращаемся на ту же страницу и автопубликуем комментарий.

Регистраций/форм/паролей нет. Только Google OAuth.

Опционально (заложить, но выключено по умолчанию): режим “Guest comments” (ник + текст без логина) — очень спамогенен. Если включать — только с Turnstile и строгим rate limit + премодерация.

4.2 Комментарии где

На странице поста /blog/[slug] — comments thread

На странице события /changelog — комментарии не нужны (только реакции)

На projects detail (если появится) — можно позже

4.3 Реакции “ко всему что можно”

Реакции должны быть:

На пост (вверху/внизу): набор эмодзи (например 👍🔥🤖💡😂🎯) + счётчики

На коммент: 👍❤️🔥😂🤖 + счётчики

Реакции доступны только авторизованным (MVP) — иначе злоупотребления.

В UI при клике на реакцию незалогиненным: open Google OAuth modal (как с комментом)

4.4 Модерация (минимум, но обязательно)

Без модерации будет ад.

Таблица флагов/репортов + скрытие комментов.

Админ-доступ: список email’ов в env ADMIN_EMAILS.

Админ-страница /admin/moderation (только SSR, защита).
Функции:

hide/unhide comment

delete comment (soft delete)

ban user (by user_id)

view recent flagged

5) Auth: Google OAuth “в 1 клик”
5.1 Технические требования

OAuth 2.0 / OpenID Connect Google

После логина создаём сессию (cookie HttpOnly, Secure, SameSite=Lax)

Сессии храним в БД (чтобы безопасно инвалидировать)

Верифицировать id_token, сохранять profile minimal:

email, name, picture (optional)

5.2 UX requirements

Кнопка “Continue with Google” в модалке, вызываемой из:

submit comment

click reaction

“Join community” CTA

Draft комментария сохраняется и восстанавливается после редиректа.

6) Auto Changelog / Events (GitHub + deploy) (как в v1, но оставляем)
6.1 DB events + фильтрация

Источники:

GitHub webhook (push + release)

Deploy endpoint (token auth)

Фильтрация коммитов (важно):

показывать только feat:, fix:, perf:, refactor:, docs: (настройка)

игнорировать merge commits

показывать top N коммитов (например 5) на push

7) Технологии (рекомендовано)
7.1 Основной стек

Astro (TypeScript) + SSR Node adapter

TailwindCSS

React islands (Command Palette, Theme Switch, Comments UI)

MDX

Postgres

Drizzle ORM

Zod validation

7.2 Anti-spam / rate limit

MVP защита:

Rate limit на POST endpoints (in-memory + IP key)
(можно заменить позже на Redis, но сейчас без него)

Для комментариев — optional Cloudflare Turnstile (рекомендуется включить сразу, даже с OAuth)

env TURNSTILE_SECRET, TURNSTILE_SITEKEY

если не задано — пропускаем проверку

8) Database Schema (обязательное)
8.1 Users + OAuth + Sessions

Минимальные таблицы:

-- users
create table users (
  id bigserial primary key,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  is_banned boolean not null default false
);

-- oauth_accounts
create table oauth_accounts (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  provider text not null,           -- 'google'
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  unique(provider, provider_user_id)
);

-- sessions
create table sessions (
  id text primary key,             -- random token id
  user_id bigint not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_user_idx on sessions(user_id);
create index sessions_exp_idx on sessions(expires_at);
8.2 Comments
create table comments (
  id bigserial primary key,
  page_type text not null,         -- 'blog_post'
  page_key text not null,          -- slug for post, e.g. 'my-post'
  lang text not null,              -- 'ru'|'en' (thread per language)
  user_id bigint references users(id) on delete set null,
  parent_id bigint references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  is_hidden boolean not null default false,
  is_deleted boolean not null default false
);

create index comments_page_idx on comments(page_type, page_key, lang, created_at);
create index comments_parent_idx on comments(parent_id);
8.3 Reactions (posts + comments)

Единая модель “reaction target”:

create table reactions (
  id bigserial primary key,
  target_type text not null,       -- 'post'|'comment'
  target_key text not null,        -- for post: slug; for comment: comment_id as text
  lang text,                       -- for post: 'ru'|'en'; for comment: inherit from comment
  user_id bigint not null references users(id) on delete cascade,
  emoji text not null,             -- '👍' '🔥' etc
  created_at timestamptz not null default now(),
  unique(target_type, target_key, user_id, emoji)
);

create index reactions_target_idx on reactions(target_type, target_key);
create index reactions_user_idx on reactions(user_id);
8.4 Flags / moderation
create table comment_flags (
  id bigserial primary key,
  comment_id bigint not null references comments(id) on delete cascade,
  user_id bigint references users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index flags_comment_idx on comment_flags(comment_id);
8.5 Events (как ранее)
create table events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  source text not null,              -- github | deploy | manual
  kind text not null,                -- commit | release | deploy | note
  project text,
  title text not null,
  url text,
  tags text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb
);

create index events_ts_idx on events (ts desc);
create index events_project_idx on events (project);
9) API Endpoints (обязательное)
9.1 Auth

GET /api/auth/google/start?returnTo=<urlencoded>

GET /api/auth/google/callback

POST /api/auth/logout

9.2 Comments

GET /api/comments?type=blog_post&key=<slug>&lang=ru|en

returns tree (nested) + reaction counts + current user reaction state

POST /api/comments

body: { pageType, pageKey, lang, parentId?, body, turnstileToken? }

requires auth (MVP)

validates, rate limit, inserts

PATCH /api/comments/:id

edit own comment (optional MVP; можно не делать, но лучше)

POST /api/comments/:id/flag

report comment

POST /api/comments/:id/hide (admin only)

POST /api/comments/:id/unhide (admin only)

9.3 Reactions

GET /api/reactions?targetType=post&targetKey=<slug>&lang=ru|en

POST /api/reactions/toggle

body: { targetType, targetKey, lang?, emoji }

requires auth

9.4 Events feed

POST /api/webhooks/github (verify HMAC signature)

POST /api/events/deploy (Bearer token)

GET /api/feed?lang=ru|en&limit=20&project=?

10) UI Components (обязательное)

Layout (Header: nav + language + theme + Join CTA; Footer)

TerminalHero (soft terminal window style)

CommandPalette (Ctrl+K)

ThemeSwitch (dropdown)

LanguageSwitch (RU/EN)

ProjectCard

EventCard + EventList

BlogCard + TagFilter

ReactionsBar (posts + comments)

CommentsThread:

textarea, replies, load more

submit triggers auth modal if not logged in

drafts preserved

AuthModal:

“Continue with Google”

returnTo + restore draft

JoinCommunityBlock (в постах и footer):

CTA: GitHub / Telegram / Reader.Market / Email (links configurable)

11) SEO / sharing (обязательное)

sitemap.xml

robots.txt

Canonical URLs

hreflang RU/EN

OpenGraph/Twitter cards

JSON-LD:

Person (Rodion)

BlogPosting

12) Deployment (server)
12.1 Runtime

SSR app on localhost port 3100 via pm2

nginx reverse proxy rodion.pro -> 127.0.0.1:3100

Nginx snippet:

location / {
  proxy_pass http://127.0.0.1:3100;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
12.2 Directories

/var/www/rodion.pro/app — repo clone

.env only on server

12.3 pm2

pm2 start npm --name rodion-pro -- run start

pm2 save

13) Environment Variables (.env)

Minimum:

SITE_URL=https://rodion.pro

DATABASE_URL=postgres://...

GITHUB_WEBHOOK_SECRET=...

DEPLOY_TOKEN=...

GOOGLE_CLIENT_ID=...

GOOGLE_CLIENT_SECRET=...

AUTH_BASE_URL=https://rodion.pro (если нужно библиотеке)

ADMIN_EMAILS=rodion89@list.ru,another@example.com

Optional (highly recommended):

TURNSTILE_SITEKEY=...

TURNSTILE_SECRET=...

14) Acceptance Criteria (Definition of Done)
i18n + theme

/ru/* и /en/* работают

язык сохраняется cookie

Theme switch работает на всех страницах, сохраняется, default Theme A

Blog + Projects + Events

Home: hero + featured projects + latest events + latest posts

Projects page: минимум 3 проекта

Blog: список + теги + страница поста

Changelog: лента событий из БД с пагинацией / load more

GitHub webhook работает (push + release), фильтрует мусор

Deploy endpoint работает (curl test)

Community

На странице поста есть CommentsThread

Можно начать писать без логина

При submit незалогиненный попадает в Google OAuth, текст не теряется

После login комментарий публикуется

Реакции на пост/комменты с авторизацией через тот же поток

Есть базовая модерация (hide/delete/flag, admin-only)

Prod

Деплой на сервер, https://rodion.pro
 без 5xx

README содержит полный deploy checklist и примеры curl/webhook config

15) Implementation Plan (Milestones для Qoder)
M1 — Bootstrap + i18n routing + base layout

Astro SSR (Node adapter), TS, Tailwind, MDX

i18n route prefix /ru /en, cookie lang

Layout + Header/Footer, Language switch

M2 — Theme system (multi-palette)

CSS tokens + data-theme

5 theme palettes (A–E)

ThemeSwitch + persistence

M3 — Content collections (Blog + Pages)

collections for blog/pages RU/EN

blog list + post page + tags + RSS

pages now/resume/contact/uses stubs RU/EN

M4 — Projects

projects.ts model RU/EN

/projects + featured section on home

M5 — DB + Auth (Google) + Sessions

Drizzle + migrations: users/oauth/sessions

Google OAuth flow start/callback/logout

AuthModal + returnTo + draft preservation infra

M6 — Comments + Reactions + moderation

migrations: comments, reactions, flags

API: comments CRUD (create/list), reactions toggle

UI: CommentsThread, ReactionsBar

Admin moderation page + ADMIN_EMAILS gate

Rate limit + (optional) Turnstile integration

M7 — Events feed (GitHub + deploy) + UI

migrations: events

webhook verification + parsing + filtering

deploy endpoint token auth

/changelog page + home latest events

M8 — Command Palette + polish

Ctrl+K palette (routes + search)

SEO: sitemap, hreflang, OG, canonical

404, performance pass

M9 — Server deploy docs + scripts

pm2 instructions + ecosystem file (optional)

nginx snippet + env checklist

smoke test steps

16) Deliverables from Qoder (строго)

Полный репозиторий исходников

Drizzle migrations

README: setup, env, deploy, webhook setup

Примеры:

GitHub webhook config

curl deploy event

curl reactions/comments (optional)