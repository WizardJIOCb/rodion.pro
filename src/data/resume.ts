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
  chips?: string[];
  items?: Array<{
    title: { ru: string; en: string };
    company?: { ru: string; en: string };
    link?: string;
    period?: string;
    description?: { ru: string; en: string };
    achievements?: Array<{ ru: string; en: string }>;
  }>;
}

export interface ResumeHeader {
  name: { ru: string; en: string };
  title: string;
  experience: { ru: string; en: string };
  workFormat: string;
  location: { ru: string; en: string };
  googleDocUrl: string;
}

export const resumeHeader: ResumeHeader = {
  name: {
    ru: 'Калимуллин Родион Данирович',
    en: 'Kalimullin Rodion Danirovich',
  },
  title: 'Senior Full-Stack Developer / Tech Lead / DevOps',
  experience: { ru: '~20 лет', en: '~20 years' },
  workFormat: 'Full-time / Contract / Remote / Hybrid',
  location: { ru: 'Россия', en: 'Russia' },
  googleDocUrl: 'https://docs.google.com/document/d/e/2PACX-1vSh-WOFGscYRkZQk6qin7YGzGQragYp44kA3OtN2tDSwowyk6IkdPw2WUzlALnxrqByJ2rPaBoo6EVZ/pub',
};

export const resumeSections: ResumeSection[] = [
  {
    id: 'profile',
    title: {
      ru: 'Профессиональный профиль',
      en: 'Professional Profile',
    },
    content: {
      ru: 'Senior Full-Stack разработчик с 20-летним коммерческим опытом и сильной экспертизой в backend, frontend, DevOps и архитектуре. Опыт работы включает: стартапы (MVP → production), финтех / банк (enterprise-микросервисы), игровая индустрия (онлайн-проекты, highload). Способен самостоятельно или в роли техлида: проектировать архитектуру с нуля, вести и координировать команды, разрабатывать сложные системы hands-on, доводить проекты до production и масштабировать. Активно использует AI-инструменты разработки для ускорения delivery и повышения качества кода.',
      en: 'Senior Full-Stack Developer with 20 years of commercial experience and strong expertise in backend, frontend, DevOps and architecture. Experience includes startups (MVP → production), fintech/banking (enterprise microservices), and gaming industry (online projects, highload). Capable independently or as a tech lead to: design architecture from scratch, lead and coordinate teams, develop complex hands-on systems, bring projects to production and scale them up. Actively uses AI development tools to speed up delivery and improve code quality.',
    },
  },
  {
    id: 'specialization',
    title: {
      ru: 'Ключевая специализация',
      en: 'Key Specialization',
    },
    chips: [
      'Senior Full-Stack Development',
      'Microservices / Enterprise systems',
      'DevOps & Infrastructure',
      'Technical leadership',
      'Startups & Business projects',
      'High-load systems',
    ],
  },
  {
    id: 'stack',
    title: {
      ru: 'Технологический стек',
      en: 'Technical Stack',
    },
    items: [
      {
        title: { ru: 'Backend', en: 'Backend' },
        description: {
          ru: 'PHP (с PHP 3 до современных версий), Java, Node.js / JavaScript (Backend), Go, REST / API / Microservices',
          en: 'PHP (from PHP 3 to modern versions), Java, Node.js / JavaScript (Backend), Go, REST / API / Microservices',
        },
      },
      {
        title: { ru: 'Frontend', en: 'Frontend' },
        description: {
          ru: 'React, Angular, Vue.js, npm, сборка и деплой',
          en: 'React, Angular, Vue.js, npm, build and deploy',
        },
      },
      {
        title: { ru: 'Базы данных', en: 'Databases' },
        description: {
          ru: 'PostgreSQL, MySQL, NoSQL: Redis, Memcached',
          en: 'PostgreSQL, MySQL, NoSQL: Redis, Memcached',
        },
      },
      {
        title: { ru: 'Очереди и асинхронность', en: 'Queues and Asynchrony' },
        description: { ru: 'RabbitMQ', en: 'RabbitMQ' },
      },
      {
        title: { ru: 'DevOps / Infrastructure', en: 'DevOps / Infrastructure' },
        description: {
          ru: 'Linux (уверенное администрирование), Docker, Nginx, CI/CD, Production-деплой и сопровождение',
          en: 'Linux (confident administration), Docker, Nginx, CI/CD, Production deployment and maintenance',
        },
      },
      {
        title: { ru: 'Наблюдаемость и мониторинг', en: 'Observability and Monitoring' },
        description: {
          ru: 'Elasticsearch, Kibana, Grafana, Логирование, метрики, диагностика production-сред',
          en: 'Elasticsearch, Kibana, Grafana, Logging, metrics, and diagnostics for production environments',
        },
      },
      {
        title: { ru: 'Процессы и инструменты', en: 'Processes and Tools' },
        description: {
          ru: 'Jira, Confluence, Agile / Scrum / Kanban',
          en: 'Jira, Confluence, Agile / Scrum / Kanban',
        },
      },
      {
        title: { ru: 'AI-инструменты', en: 'AI Tools' },
        description: {
          ru: 'Qoder, Kilo AI, Cursor AI, Claude Code, AI-подходы к генерации, рефакторингу и анализу кода',
          en: 'Qoder, Kilo AI, Cursor AI, Claude Code, AI approaches to code generation, refactoring, and analysis',
        },
      },
    ],
  },
  {
    id: 'experience',
    title: {
      ru: 'Опыт работы',
      en: 'Work Experience',
    },
    items: [
      {
        title: { ru: 'Full-Stack Developer', en: 'Full-Stack Developer' },
        company: { ru: 'Хоум Банк', en: 'Home Bank' },
        link: 'https://homebank.ru',
        achievements: [
          { ru: 'Разработка и сопровождение банковских микросервисов', en: 'Development and support of banking microservices' },
          { ru: 'Работа в enterprise-микросервисной архитектуре', en: 'Work in enterprise microservice architecture' },
          { ru: 'Поддержка и доработка критичных сервисов', en: 'Support and improvement of critical services' },
          { ru: 'Взаимодействие с backend, DevOps и аналитическими командами', en: 'Collaboration with backend, DevOps, and analytics teams' },
          { ru: 'Работа с логированием, мониторингом и инфраструктурой', en: 'Working with logging, monitoring, and infrastructure' },
          { ru: 'Использование Jira / Confluence', en: 'Using Jira / Confluence' },
        ],
      },
      {
        title: { ru: 'Senior Full-Stack Developer / DevOps', en: 'Senior Full-Stack Developer / DevOps' },
        company: { ru: 'Forward LLC', en: 'Forward LLC' },
        link: 'https://forward-leasing.ru',
        achievements: [
          { ru: 'Разработка backend и frontend', en: 'Backend and frontend development' },
          { ru: 'Участие в создании и развитии стартапа', en: 'Participation in the creation and development of a startup' },
          { ru: 'Проектирование архитектуры', en: 'Architectural design' },
          { ru: 'Деплой, инфраструктура, сопровождение', en: 'Deployment, infrastructure, maintenance' },
          { ru: 'Работа с БД, очередями, оптимизация', en: 'Working with databases, queues, optimization' },
        ],
      },
      {
        title: { ru: 'Senior Full-Stack Developer', en: 'Senior Full-Stack Developer' },
        company: { ru: 'Authentica', en: 'Authentica' },
        link: 'https://authentica.love',
        achievements: [
          { ru: 'Full-stack разработка продукта', en: 'Full-stack product development' },
          { ru: 'Развитие стартапа', en: 'Startup development' },
          { ru: 'Интеграция бизнес-логики и UI', en: 'Integration of business logic and UI' },
        ],
      },
      {
        title: { ru: 'Lead Developer / Tech Lead', en: 'Lead Developer / Tech Lead' },
        company: { ru: 'Игровая индустрия', en: 'Gaming Industry' },
        description: {
          ru: 'TownWars / Городские Войны, Avangard Online, Пилиция',
          en: 'TownWars, Avangard Online, Пилиция',
        },
        achievements: [
          { ru: 'Техническое лидерство', en: 'Technical leadership' },
          { ru: 'Архитектура серверов и игровых систем', en: 'Server and game system architecture' },
          { ru: 'Full-Stack + DevOps', en: 'Full-Stack + DevOps' },
          { ru: 'Масштабирование и поддержка онлайн-проектов', en: 'Scaling and supporting online projects' },
          { ru: 'Управление разработкой', en: 'Development management' },
        ],
      },
    ],
  },
  {
    id: 'pet-projects',
    title: {
      ru: 'Pet-проекты',
      en: 'Pet Projects',
    },
    items: [
      {
        title: { ru: 'reader.market', en: 'reader.market' },
        link: 'https://reader.market',
        description: {
          ru: 'Платформа для чтения книг с использованием ИИ. Full-stack + DevOps реализация. AI-интеграции.',
          en: 'AI-powered book reading platform. Full-stack + DevOps implementation. AI integrations.',
        },
      }/*,
      {
        title: { ru: 'cyka.lol', en: 'cyka.lol' },
        link: 'https://cyka.lol',
        description: {
          ru: 'Фан-проект / экспериментальная площадка.',
          en: 'Fan project / experimental platform.',
        },
      },*/
    ],
  },
];
