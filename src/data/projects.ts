export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface Project {
  id: string;
  title: { ru: string; en: string };
  tagline: { ru: string; en: string };
  status: ProjectStatus;
  links: {
    site?: string;
    github?: string;
    demo?: string;
  };
  stack: string[];
  highlights: { ru: string[]; en: string[] };
  featured?: boolean;
}

// Новые проекты добавляем в начало списка, чтобы свежие работы были первыми.
export const projects: Project[] = [
  {
    id: 'images-xedoc',
    title: {
      ru: 'images.xedoc.ru',
      en: 'images.xedoc.ru',
    },
    tagline: {
      ru: 'MVP-сервис генерации изображений с веб-панелью, очередью задач и ComfyUI worker',
      en: 'Image generation MVP with a web panel, job queue, and ComfyUI worker',
    },
    status: 'active',
    links: {
      site: 'https://images.xedoc.ru',
      github: 'https://github.com/WizardJIOCb/images.xedoc.ru',
    },
    stack: ['React', 'Vite', 'Fastify', 'PostgreSQL', 'Redis', 'ComfyUI'],
    highlights: {
      ru: [
        'React + Vite + Tailwind интерфейс для генерации, очереди и галереи',
        'Fastify API с локальным файловым хранилищем и worker endpoints',
        'Очередь задач на BullMQ/Redis и схема PostgreSQL через Drizzle',
        'Отдельный GPU worker для домашнего Windows ПК с ComfyUI',
      ],
      en: [
        'React + Vite + Tailwind interface for generation, queue, and gallery',
        'Fastify API with local file storage and worker endpoints',
        'BullMQ/Redis job queue and PostgreSQL schema via Drizzle',
        'Separate GPU worker for a home Windows PC with ComfyUI',
      ],
    },
    featured: true,
  },
  {
    id: 'hands-xedoc',
    title: {
      ru: 'hands.xedoc.ru',
      en: 'hands.xedoc.ru',
    },
    tagline: {
      ru: 'Веб-прототип управления жестами и лицевыми сигналами через камеру',
      en: 'Camera-based gesture and face-signal control prototype',
    },
    status: 'active',
    links: {
      site: 'https://hands.xedoc.ru',
    },
    stack: ['TypeScript', 'Vite', 'MediaPipe', 'Camera API', 'OBS'],
    highlights: {
      ru: [
        'Трекинг рук и лица через MediaPipe',
        'Жесты, мимика и повороты головы как сигналы',
        'Output-режим для Streamlabs/OBS',
        'Webhook для отправки событий во внешние сценарии',
      ],
      en: [
        'Hand and face tracking with MediaPipe',
        'Gestures, facial expressions, and head poses as signals',
        'Output mode for Streamlabs/OBS',
        'Webhook events for external automations',
      ],
    },
    featured: true,
  },
  {
    id: 'music-xedoc',
    title: {
      ru: 'music.xedoc.ru',
      en: 'music.xedoc.ru',
    },
    tagline: {
      ru: 'Публичный интерфейс генерации музыки на StableDAW',
      en: 'Public prompt-to-music interface powered by StableDAW',
    },
    status: 'active',
    links: {
      site: 'https://music.xedoc.ru',
    },
    stack: ['HTML', 'Nginx', 'StableDAW', 'Python', 'SSH Tunnel'],
    highlights: {
      ru: [
        'Простая страница prompt-to-music',
        'Полный StableDAW editor через /editor',
        'Генерация через локальный backend и SSH reverse tunnel',
        'Патчи для аудио, библиотеки, голосований и LLM-помощника',
      ],
      en: [
        'Simple prompt-to-music page',
        'Full StableDAW editor at /editor',
        'Generation through a local backend and SSH reverse tunnel',
        'Patches for audio, library, votes, and LLM prompt helper',
      ],
    },
    featured: true,
  },
  {
    id: 'crimson-wars',
    title: {
      ru: 'Crimson Wars',
      en: 'Crimson Wars',
    },
    tagline: {
      ru: 'Сессионный кооперативный кровавый сурвайвал против зомби',
      en: 'Session-based co-op bloody survival against zombies',
    },
    status: 'active',
    links: {
      site: 'https://crimsonwars.ru',
      github: 'https://github.com/WizardJIOCb/crimson-wars',
    },
    stack: ['Astro', 'React', 'TypeScript', 'Tailwind', 'PostgreSQL', 'Drizzle'],
    highlights: {
      ru: [
        'Кооперативные сессии против зомби',
        'Кровавый survival с упором на выживание',
      ],
      en: [
        'Co-op sessions against zombies',
        'Bloody survival focused on staying alive',
      ],
    },
    featured: true,
  },
  {
    id: 'reader-market',
    title: {
      ru: 'Reader.Market',
      en: 'Reader.Market',
    },
    tagline: {
      ru: 'Платформа для чтения и публикации контента',
      en: 'Platform for reading and publishing content',
    },
    status: 'active',
    links: {
      site: 'https://reader.market',
    },
    stack: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
    highlights: {
      ru: [
        'Веб-приложение для чтения книг',
        'Система комментариев и рецензий',
        'Персонализированные рекомендации',
        'Статистика чтения',
      ],
      en: [
        'Web application for reading books',
        'Comments and reviews system',
        'Personalized recommendations',
        'Reading statistics',
      ],      
    },
    featured: true,
  },
  {
    id: 'xedoc',
    title: {
      ru: 'xedoc.ru',
      en: 'xedoc.ru',
    },
    tagline: {
      ru: 'Приватный web-workbench для Codex-разработки из браузера',
      en: 'Private web workbench for Codex-driven development from a browser',
    },
    status: 'active',
    links: {
      site: 'https://xedoc.ru',
      github: 'https://github.com/WizardJIOCb/xedoc.ru',
    },
    stack: ['React', 'Vite', 'Fastify', 'SQLite', 'WebSocket', 'Codex CLI'],
    highlights: {
      ru: [
        'PWA-интерфейс для проектов, чатов, задач, логов, файлов и diff',
        'Fastify API, SQLite и WebSocket-соединения для UI и агентов',
        'Windows/Linux агент запускает Codex CLI в разрешенных папках',
        'Синхронизация локальных Codex и VS Code чатов',
      ],
      en: [
        'PWA interface for projects, chats, jobs, logs, files, and diffs',
        'Fastify API, SQLite, and WebSocket connections for UI and agents',
        'Windows/Linux agent runs Codex CLI inside allowlisted folders',
        'Syncs local Codex and VS Code chats',
      ],
    },
    featured: true,
  }/*,
  {
    id: 'cyka-lol',
    title: {
      ru: 'Cyka.LOL',
      en: 'Cyka.LOL',
    },
    tagline: {
      ru: 'Блог, новости, стримы и экспериментальные проекты',
      en: 'Blog, news, game streams and experimental projects',
    },
    status: 'active',
    links: {
      site: 'https://cyka.lol',
    },
    stack: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Redis'],
    highlights: {
      ru: [
        'Блог и новости',
        'Стримы игр',
        'Экспериментальные проекты',
        'Мультимедиа контент',
      ],
      en: [
        'Blog and news',
        'Game streaming',
        'Experimental projects',
        'Multimedia content',
      ],
    },
    featured: true,
  }*/,
  
];

export function getProjectsByLang(lang: 'ru' | 'en') {
  return projects.map((project) => ({
    ...project,
    title: project.title[lang],
    tagline: project.tagline[lang],
    highlights: project.highlights[lang],
  }));
}

export function getFeaturedProjects(lang: 'ru' | 'en') {
  return getProjectsByLang(lang).filter((p) => p.featured);
}
