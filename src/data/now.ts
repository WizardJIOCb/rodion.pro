export interface NowSection {
  id: string;
  title: {
    ru: string;
    en: string;
  };
  content: {
    ru: string;
    en: string;
  };
  items?: Array<{
    title: { ru: string; en: string };
    description?: { ru: string; en: string };
    link?: string;
  }>;
}

export const nowSections: NowSection[] = [
  {
    id: 'work',
    title: {
      ru: 'Работа',
      en: 'Work'
    },
    content: {
      ru: 'Работаю над масштабированием инфраструктуры и оптимизацией производительности высоконагруженных систем.',
      en: 'Working on scaling infrastructure and optimizing performance of high-load systems.'
    }
  },
  {
    id: 'projects',
    title: {
      ru: 'Проекты',
      en: 'Projects'
    },
    content: {
      ru: 'Развиваю персональный сайт и экспериментирую с новыми подходами к веб-разработке и DevOps практикам.',
      en: 'Developing personal website and experimenting with new approaches to web development and DevOps practices.'
    }
  },
  {
    id: 'learning',
    title: {
      ru: 'Изучаю',
      en: 'Learning'
    },
    content: {
      ru: 'Глубже погружаюсь в архитектуру микросервисов, изучаю современные подходы к observability и security.',
      en: 'Deep diving into microservices architecture, studying modern approaches to observability and security.'
    },
    items: [
      {
        title: { ru: 'Rust для системного программирования', en: 'Rust for systems programming' },
        description: { ru: 'Изучаю Rust для написания высокопроизводительных сервисов', en: 'Learning Rust for building high-performance services' }
      },
      {
        title: { ru: 'eBPF и сетевые технологии', en: 'eBPF and networking' },
        description: { ru: 'Изучаю eBPF для мониторинга и оптимизации сетевых взаимодействий', en: 'Studying eBPF for monitoring and optimizing network interactions' }
      },
      {
        title: { ru: 'AI/ML инструменты', en: 'AI/ML tools' },
        description: { ru: 'Экспериментирую с LLM и инструментами машинного обучения', en: 'Experimenting with LLMs and machine learning tools' }
      }
    ]
  }
];

export const getLastUpdated = () => ({
  ru: 'Февраль 2026',
  en: 'February 2026'
});