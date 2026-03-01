# Задача: rodion.pro /activity — v2 (контроль времени, упрощение графика, топ-приложения, i18n/приватность)

Репо: https://github.com/WizardJIOCb/rodion.pro
Цель: сделать /activity более “product-like”: понятный график (без каши из единиц), явный выбор временного окна, улучшить Top Applications (сортировки/тултипы/копирование), подчистить i18n и добавить понятную заметку про приватность (что не логируем текст, только счётчики).

## Ограничения/стиль
- НЕ добавлять новые зависимости без необходимости.
- Сохранить текущий “mono-green/terminal” визуальный стиль.
- По возможности использовать уже существующие CSS vars (useThemeColors) и tailwind-классы.
- Должно работать в RU/EN (страницы /ru/activity и /en/activity).

## Где править
- UI: 
  - src/components/ActivityDashboard.tsx
  - src/components/ActivityTimelineChart.tsx
  - src/components/ActivityTopApps.tsx
- API:
  - src/pages/api/activity/v1/stats.ts
- Pages:
  - src/pages/ru/activity.astro
  - src/pages/en/activity.astro
  - src/pages/activity.astro

---

# 1) Time Range Selector (главный пункт)
Добавить явный выбор временного окна для графика (и данных Top Apps/Top Categories тоже).

### UI
Разместить контрол рядом с заголовком “Activity Timeline”:
- Segmented buttons: `1h`, `4h`, `Today`, `7d`, `30d`, `Custom`
- По умолчанию: `4h` (как сейчас).
- Сохранять выбранное окно в localStorage (ключ типа `activity.range`), чтобы при обновлении страницы не сбрасывалось.

### Логика
При смене range пересчитывать `from/to/group` и перезапрашивать `/api/activity/v1/stats`.
Рекомендация по group:
- `1h` и `4h` → `group=15min` (иначе на hour будет 1–4 точки и график “мертвый”)
- `Today` → `group=hour`
- `7d` и `30d` → `group=day`
- `Custom`:
  - показывать два инпута datetime-local (from/to)
  - валидировать from < to
  - group выбирать автоматически: если интервал <= 48h → hour/15min (лучше 15min если <= 12h), иначе day

Range должен влиять на:
- series (timeline)
- seriesByWindow (By Window mode)
- topApps/topTitles/topCategories (чтобы они соответствовали выбранному периоду)

---

# 2) Backend: поддержать group=15min
Сейчас stats API принимает group hour/day. Добавить `15min`.

Файл: `src/pages/api/activity/v1/stats.ts`

### Требования
- group может быть: `day | hour | 15min`
- Для `15min` использовать SQL bucket по 15 минутам (примерный подход):
  - date_trunc('hour', ts) + floor(extract(minute from ts)/15)*interval '15 minutes'
- Важно: этот bucket должен использоваться одинаково для:
  - series (time series)
  - rawWindowSeries (By Window)
- Ответ JSON поле `group` должно возвращать фактическое значение (`15min` тоже).

---

# 3) Упростить график (убрать “кашу единиц”)
Сейчас metrics mode позволяет включить несколько метрик сразу и это смешивает секунды и counts → мозг страдает.

Файл: `src/components/ActivityTimelineChart.tsx`

### Новая модель (простая)
В Metrics режиме показывать ТОЛЬКО одну выбранную метрику за раз:
- Active Time (area)
- AFK Time (area)
- Keys (line)
- Clicks (line)
- Scroll (line)

UI:
- вместо toggle-мультивыбора сделать segmented/radio: выбрать одну метрику
- YAxis должен быть один (не два) и в правильной единице
- Tooltip адаптировать под одну метрику (но можно оставить текущий, просто показывать выбранное)

Оставить режим `By Window` как есть.

### X-axis labels
При group=15min показывать HH:MM, при hour — HH:00, при day — дату.
(Можно определить формат по шагу между t или по `group`, который передавать в пропсы.)

---

# 4) Top Applications: сортировки + тултипы + copy
Файл: `src/components/ActivityTopApps.tsx`

### Доработки
1) Сортировка списка (и легенды) переключателем:
- Time (activeSec) — default
- Keys
- Clicks
- Scroll (если удобно)

2) Длинные названия:
- в списке приложений и в window titles использовать ellipsis (truncate) + tooltip с полным текстом (title=... или кастомный tooltip)
- для pie legend — тоже ellipsis + tooltip

3) Copy-to-clipboard:
- добавить маленькую кнопку “copy” (иконка или текст) на hover:
  - для app name
  - для window title в раскрытом списке
- использовать `navigator.clipboard.writeText(...)`, с тихим “copied” (можно маленький transient текст)

4) Не ломать текущую логику:
- showTitlesPie (когда выбран category и мало приложений) оставить, но улучшить UX тултипами/ellipsis.

---

# 5) Приватность (важно)
Добавить компактный инфо-блок (ru/en) рядом с метриками или под заголовком страницы:
- RU: “Мы храним только счётчики (keys/clicks/scroll/active time). Тексты/символы и содержимое не записываются.”
- EN: “We store counters only (keys/clicks/scroll/active time). No actual text/keystrokes content is recorded.”

Файл: лучше `ActivityDashboard.tsx` (один блок на всю страницу).

---

# 6) i18n подчистить и реально прокинуть lang
Сейчас компоненты имеют словарь, но в UI местами остаётся EN по умолчанию.

### Требования
- /ru/activity должен рендерить ActivityDashboard с `lang="ru"`
- /en/activity — `lang="en"`
- Для /activity (без префикса) — можно по cookie/lang из URL (как сейчас в Layout), но минимум: оставить EN

Также заменить оставшиеся хардкод-строки типа “No activity data available” на t().

---

# 7) QA / Acceptance Criteria
1) Time range переключается без перезагрузки страницы и меняет:
- график
- top apps
- top categories

2) Metrics chart:
- в metrics mode всегда ровно 1 метрика
- один Y-axis (без двух шкал)

3) Top apps:
- сортировка работает
- длинные строки не ломают верстку (ellipsis)
- tooltip показывает полное
- copy работает

4) RU/EN:
- /ru/activity реально на русском (основные заголовки/лейблы)
- /en/activity — на английском

5) Команды:
- `npm run lint`
- `npm run typecheck`

---

# План коммитов (желательно)
1) feat(activity): add range selector + state persistence
2) feat(api): add stats group=15min
3) refactor(charts): single-metric mode + better x-axis formatting
4) feat(top-apps): sorting + tooltips + copy
5) chore(i18n): clean remaining strings + pass lang properly