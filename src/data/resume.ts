export interface ResumeSection {
  id: string;
  title: {
    ru: string;
    en: string;
  };
  content?: {
    ru: string;
    en: string;
  };
  items?: Array<{
    title: string;
    company?: string;
    period?: string;
    description?: string;
    achievements?: string[];
  }>;
}

export const resumeSections: ResumeSection[] = [
  {
    id: 'summary',
    title: {
      ru: 'О себе',
      en: 'Summary'
    },
    content: {
      ru: 'Разработчик с опытом в системной архитектуре, DevOps и AI/ML инструментах. Специализируюсь на создании масштабируемых и надежных систем.',
      en: 'Developer with experience in system architecture, DevOps, and AI/ML tooling. Specialized in building scalable and reliable systems.'
    }
  },
  {
    id: 'experience',
    title: {
      ru: 'Опыт',
      en: 'Experience'
    },
    items: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Company',
        period: '2020 - Present',
        description: 'Разработка и поддержка высоконагруженных распределенных систем',
        achievements: [
          'Спроектировал и внедрил микросервисную архитектуру для обработки миллионов запросов в день',
          'Оптимизировал производительность системы на 40%',
          'Внедрил CI/CD pipeline с автоматическим тестированием и deployment'
        ]
      },
      {
        title: 'DevOps Engineer',
        company: 'Startup Inc',
        period: '2018 - 2020',
        description: 'Ответственный за инфраструктуру и процессы доставки',
        achievements: [
          'Мигрировал всю инфраструктуру в облако AWS',
          'Настроил мониторинг и alerting для всей системы',
          'Создал автоматизированную систему backup и disaster recovery'
        ]
      }
    ]
  },
  {
    id: 'skills',
    title: {
      ru: 'Навыки',
      en: 'Skills'
    },
    items: [
      {
        title: 'Backend Development',
        description: 'TypeScript, Node.js, Python, Go, Rust'
      },
      {
        title: 'Infrastructure & DevOps',
        description: 'Docker, Kubernetes, AWS, Terraform, Ansible'
      },
      {
        title: 'Databases',
        description: 'PostgreSQL, Redis, MongoDB, Elasticsearch'
      },
      {
        title: 'Monitoring & Observability',
        description: 'Prometheus, Grafana, ELK stack, OpenTelemetry'
      },
      {
        title: 'AI/ML Tools',
        description: 'TensorFlow, PyTorch, LangChain, LLM APIs'
      }
    ]
  },
  {
    id: 'education',
    title: {
      ru: 'Образование',
      en: 'Education'
    },
    items: [
      {
        title: 'Магистр компьютерных наук',
        company: 'Технический университет',
        period: '2016 - 2018'
      },
      {
        title: 'Бакалавр информационных технологий',
        company: 'Государственный университет',
        period: '2012 - 2016'
      }
    ]
  }
];