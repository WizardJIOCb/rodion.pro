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
    title: { ru: string; en: string };
    company?: { ru: string; en: string };
    period?: string;
    description?: { ru: string; en: string };
    achievements?: Array<{ ru: string; en: string }>;
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
        title: { ru: 'Senior Software Engineer', en: 'Senior Software Engineer' },
        company: { ru: 'Tech Company', en: 'Tech Company' },
        period: '2020 - Present',
        description: { ru: 'Разработка и поддержка высоконагруженных распределенных систем', en: 'Development and maintenance of high-load distributed systems' },
        achievements: [
          { ru: 'Спроектировал и внедрил микросервисную архитектуру для обработки миллионов запросов в день', en: 'Designed and implemented microservices architecture handling millions of requests per day' },
          { ru: 'Оптимизировал производительность системы на 40%', en: 'Optimized system performance by 40%' },
          { ru: 'Внедрил CI/CD pipeline с автоматическим тестированием и deployment', en: 'Implemented CI/CD pipeline with automated testing and deployment' }
        ]
      },
      {
        title: { ru: 'DevOps Engineer', en: 'DevOps Engineer' },
        company: { ru: 'Startup Inc', en: 'Startup Inc' },
        period: '2018 - 2020',
        description: { ru: 'Ответственный за инфраструктуру и процессы доставки', en: 'Responsible for infrastructure and delivery processes' },
        achievements: [
          { ru: 'Мигрировал всю инфраструктуру в облако AWS', en: 'Migrated entire infrastructure to AWS cloud' },
          { ru: 'Настроил мониторинг и alerting для всей системы', en: 'Set up monitoring and alerting for the entire system' },
          { ru: 'Создал автоматизированную систему backup и disaster recovery', en: 'Built automated backup and disaster recovery system' }
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
        title: { ru: 'Backend Development', en: 'Backend Development' },
        description: { ru: 'TypeScript, Node.js, Python, Go, Rust', en: 'TypeScript, Node.js, Python, Go, Rust' }
      },
      {
        title: { ru: 'Infrastructure & DevOps', en: 'Infrastructure & DevOps' },
        description: { ru: 'Docker, Kubernetes, AWS, Terraform, Ansible', en: 'Docker, Kubernetes, AWS, Terraform, Ansible' }
      },
      {
        title: { ru: 'Databases', en: 'Databases' },
        description: { ru: 'PostgreSQL, Redis, MongoDB, Elasticsearch', en: 'PostgreSQL, Redis, MongoDB, Elasticsearch' }
      },
      {
        title: { ru: 'Monitoring & Observability', en: 'Monitoring & Observability' },
        description: { ru: 'Prometheus, Grafana, ELK stack, OpenTelemetry', en: 'Prometheus, Grafana, ELK stack, OpenTelemetry' }
      },
      {
        title: { ru: 'AI/ML Tools', en: 'AI/ML Tools' },
        description: { ru: 'TensorFlow, PyTorch, LangChain, LLM APIs', en: 'TensorFlow, PyTorch, LangChain, LLM APIs' }
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
        title: { ru: 'Магистр компьютерных наук', en: 'Master of Computer Science' },
        company: { ru: 'Технический университет', en: 'Technical University' },
        period: '2016 - 2018'
      },
      {
        title: { ru: 'Бакалавр информационных технологий', en: 'Bachelor of Information Technology' },
        company: { ru: 'Государственный университет', en: 'State University' },
        period: '2012 - 2016'
      }
    ]
  }
];