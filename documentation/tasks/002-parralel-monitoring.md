У нас при этом будут учитываться все окна? Например я программирую и смотрю видео одновременно или музыку сшулаю ещё, это тоже должно фиксироваться

Да, но с оговоркой: “все окна одновременно” в нормальных трекерах почти никогда не означает “всё, что видно на экране”. По умолчанию ActivityWatch (и аналоги) логируют только активное (focused) окно/приложение — то, куда сейчас уходит ввод. Это прямо следует из описания aw-watcher-window: он “watches the active window”.

Что будет в твоём кейсе “кодю + видео/музыка”

Если ты пишешь код, а YouTube/музыка играет в фоне, то базовый трекинг запишет минуту как VS Code (coding), а фон не учтёт как отдельную активность.

То есть “параллельность” не фиксируется сама собой, потому что ОС не даёт простого “истинного” времени внимания на два приложения.

Как сделать, чтобы фиксировалось “параллельно”

Реалистичный и полезный вариант: хранить Primary activity + Secondary signals.

1) Primary = активное окно (как и сейчас)

primaryApp, primaryCategory, isAfk

2) Secondary = “что играет звук сейчас” (музыка/видео)

Это решает 90% твоего запроса: музыка/видео почти всегда сопровождаются аудио.

На Windows это можно определить через Core Audio / audio sessions (как в системном микшере по приложениям).
В Python это удобно делается через pycaw, который умеет работать с аудио-сессиями.

Тогда ты увидишь на /activity примерно:

Primary: coding (code.exe)

Secondary: audio: spotify.exe / chrome.exe

Что именно надо поправить в ТЗ для Qoder (вставь как “Patch”)

Добавь в ТЗ раздел “Параллельная активность”:

A) Контракт ingest расширить

{
  "sentAt": "...",
  "intervalSec": 10,
  "now": {
    "primary": { "app": "code.exe", "category": "coding", "isAfk": false },
    "secondary": {
      "audioApps": [
        { "app": "spotify.exe", "category": "entertainment" },
        { "app": "chrome.exe", "category": "entertainment" }
      ]
    }
  },
  "counts": { "keys": 42, "clicks": 3, "scroll": 5 }
}

B) Правило агрегации

minute_agg хранит primary как раньше.

Отдельно хранит audio_minute_agg (или jsonb поле audio_apps) — факт “в эту минуту был звук от таких-то процессов”.

На UI показывать “Также сейчас: 🎧 …” и отдельную статистику “время с аудио по приложениям”.

C) Privacy

Для audioApps хранить только имя процесса (spotify.exe / chrome.exe), без titles/urls.

Разрешить режим categoriesOnly где вместо app показывается только audioCategory.

D) Agent (Windows)

Добавить модуль audio-watcher:

определяет активные audio sessions по процессам (CoreAudio/WASAPI)

фильтрует “тихие” (по порогу)

отдаёт список процессов, где звук реально идёт в последние N секунд

Вывод по твоему вопросу

“Все окна” как “всё что открыто” — нет, и это даже вредно (приватность + мусор).

“Кодю + играет музыка/видео” — да, это фиксируем нормально через secondary audio-сигнал, и на дашборде будет видно параллельную активность.

Если хочешь, могу прямо дописать в твой документ для Qoder готовыми блоками: DB таблица для audio, эндпоинты stats (audioTopApps, audioMinutesByHour) и UI-виджеты (“Audio timeline”).

в Windows же есть вот такая вещь, которая знает что я слушаю или смотрю, можем это использовать?
Думал на протяжении 51s

Да — это ровно Windows System Media Transport Controls (SMTC), тот самый “медиа-виджет” который появляется при громкости/медиаклавишах. Его можно читать программно: получить какое приложение сейчас “главное” для управления, статус playback и метаданные трека/видео.

Но важная оговорка: SMTC обычно даёт “current session” — одну сессию, которую система считает главной, а не “все источники, которые играют параллельно”. Можно получить список всех сессий, но “кто реально звучит прямо сейчас” SMTC не всегда решает лучше, чем CoreAudio.

Как это использовать в твоей схеме rodion.pro

Делаем Secondary signal для “что слушаю/смотрю”, чтобы даже когда primary = code.exe, ты видел что параллельно играет:

1) SMTC watcher (metadata / now playing)

Снимаем:

sourceAppId (какое приложение отдаёт медиа-сессию)

playbackStatus (Playing/Paused)

media (title/artist/album) строго опционально и только для private, по умолчанию выключено

(опционально) thumbnail не отправлять на сервер, максимум локально

Технически это через WinRT API:

GlobalSystemMediaTransportControlsSessionManager.RequestAsync()

GetCurrentSession() (“сессия, которую система считает наиболее вероятной для управления”)

2) Audio sessions watcher (мульти-источники параллельно)

Чтобы учитывать сценарий “YouTube играет + Spotify играет” — SMTC может выбрать только один “current”. Тогда второй слой делает CoreAudio sessions и отдаёт список процессов, у которых реально идёт звук (без названий треков). Это и есть честное “параллельно”.

Итог: на сайте показываем:

Primary: активное окно (кодишь/играешь/чатишь)

Secondary:

audioActiveApps[] (что реально звучит)

nowPlaying (красивая карточка “что именно играет” от SMTC — если включено)

Почему не запускать как Windows Service

SMTC/WinRT часто не работает, если агент запущен как service / SYSTEM — нужно запускать в контексте пользователя (Scheduled Task при логине).

Мини-пример кода (C#, чтобы Qoder понял API)
using Windows.Media.Control;

var mgr = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
var session = mgr.GetCurrentSession(); // “current session”
if (session != null)
{
    var app = session.SourceAppUserModelId;
    var playback = session.GetPlaybackInfo().PlaybackStatus;
    var media = await session.TryGetMediaPropertiesAsync(); // title/artist etc (optional)
}

(Методы RequestAsync/GetCurrentSession описаны в доках WinRT.)

Патч в ТЗ для Qoder (вставить как новый раздел)

Раздел: “Параллельная медиа-активность (Windows SMTC + Audio)”

В activity-agent добавить два модуля:

smtc-watcher (WinRT) → nowPlaying

audio-watcher (CoreAudio sessions) → audioActiveApps[]

Расширить ingest payload:

{
  "sentAt": "...",
  "intervalSec": 10,
  "now": { "app": "code.exe", "category": "coding", "isAfk": false },
  "secondary": {
    "audioActiveApps": ["chrome.exe", "spotify.exe"],
    "nowPlaying": {
      "sourceApp": "spotify.exe",
      "status": "playing",
      "title": null,
      "artist": null
    }
  },
  "counts": { "keys": 42, "clicks": 3, "scroll": 5 }
}

Privacy defaults:

nowPlaying.title/artist по умолчанию null (выключено)

audioActiveApps можно переводить в categoriesOnly

UI /activity:

в “Now” добавить строку: 🎧 Also playing: chrome.exe / spotify.exe

отдельный виджет “Audio timeline” (минуты с аудио по часам)

Если хочешь “максимально просто для реализации Qoder-ом”: пусть он сделает smtc-watcher как маленький .NET 8 single-file exe, который агент (Node) вызывает раз в 5–10 секунд и читает JSON со stdout. Это надёжнее, чем пытаться тащить WinRT прямо в Node.