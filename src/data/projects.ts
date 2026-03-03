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
    id: 'ai-toolkit',
    title: {
      ru: 'AI Toolkit',
      en: 'AI Toolkit',
    },
    tagline: {
      ru: 'Набор утилит для работы с AI моделями',
      en: 'Utilities for working with AI models',
    },
    status: 'active',
    links: {
      github: 'https://github.com/WizardJIOCb/ai-toolkit',
    },
    stack: ['Python', 'LangChain', 'OpenAI', 'FastAPI'],
    highlights: {
      ru: [
        'Обёртки для популярных LLM API',
        'Промпт-инжиниринг утилиты',
        'RAG pipeline components',
      ],
      en: [
        'Wrappers for popular LLM APIs',
        'Prompt engineering utilities',
        'RAG pipeline components',
      ],
    },
    featured: true,
  },
  {
    id: 'devops-templates',
    title: {
      ru: 'DevOps Templates',
      en: 'DevOps Templates',
    },
    tagline: {
      ru: 'Шаблоны для CI/CD и инфраструктуры',
      en: 'Templates for CI/CD and infrastructure',
    },
    status: 'active',
    links: {
      github: 'https://github.com/WizardJIOCb/devops-templates',
    },
    stack: ['Docker', 'GitHub Actions', 'Terraform', 'Ansible'],
    highlights: {
      ru: [
        'GitHub Actions workflows',
        'Docker Compose конфигурации',
        'Terraform модули для AWS/GCP',
      ],
      en: [
        'GitHub Actions workflows',
        'Docker Compose configurations',
        'Terraform modules for AWS/GCP',
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
