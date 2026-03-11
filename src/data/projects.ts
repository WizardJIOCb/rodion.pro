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

export const projects: Project[] = [
  {
    id: 'crimson-wars',
    title: {
      ru: 'Crimson Wars',
      en: 'Crimson Wars',
    },
    tagline: {
      ru: 'Персональный сайт в стиле soft cyberpunk',
      en: 'Personal website with soft cyberpunk aesthetics',
    },
    status: 'active',
    links: {
      site: 'https://crimson.rodion.pro',
      github: 'https://github.com/WizardJIOCb/crimson-wars',
    },
    stack: ['Astro', 'React', 'TypeScript', 'Tailwind', 'PostgreSQL', 'Drizzle'],
    highlights: {
      ru: [
        'Survival игра'        
      ],
      en: [
        'Survival game'
      ],
    },
    featured: true,
  },
  {
    id: 'rodion-pro',
    title: {
      ru: 'rodion.pro',
      en: 'rodion.pro',
    },
    tagline: {
      ru: 'Персональный сайт в стиле soft cyberpunk',
      en: 'Personal website with soft cyberpunk aesthetics',
    },
    status: 'active',
    links: {
      site: 'https://rodion.pro',
      github: 'https://github.com/WizardJIOCb/rodion.pro',
    },
    stack: ['Astro', 'React', 'TypeScript', 'Tailwind', 'PostgreSQL', 'Drizzle'],
    highlights: {
      ru: [
        'Терминальный дизайн с 5 цветовыми темами',
        'RU/EN локализация',
        'Комментарии и реакции с Google OAuth',
        'Автоматический changelog из GitHub',
      ],
      en: [
        'Terminal design with 5 color themes',
        'RU/EN localization',
        'Comments and reactions with Google OAuth',
        'Automatic changelog from GitHub',
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
    id: 'Cromson',
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
  },
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
