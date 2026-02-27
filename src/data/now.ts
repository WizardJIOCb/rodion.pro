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
    title: string;
    description?: string;
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
        title: 'Rust для системного программирования',
        description: 'Изучаю Rust для написания высокопроизводительных сервисов'
      },
      {
        title: 'eBPF и сетевые технологии',
        description: 'Изучаю eBPF для мониторинга и оптимизации сетевых взаимодействий'
      },
      {
        title: 'AI/ML инструменты',
        description: 'Экспериментирую с LLM и инструментами машинного обучения'
      }
    ]
  }
];

export const getLastUpdated = () => ({
  ru: 'Февраль 2026',
  en: 'February 2026'
});