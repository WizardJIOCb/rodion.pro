export interface ExperienceItem {
  company: string;
  role: string;
  bullets: string[];
}

export interface StackSection {
  section: string;
  items: string[];
}

export interface PetProject {
  name: string;
  bullets: string[];
}

export interface ResumeShort {
  name: string;
  title: string;
  experience: string;
  workFormat: string;
  location: string;
  highlights: string[];
  keySpecialization: string[];
  stackChips: string[];
  stackDetails: StackSection[];
  experienceShort: ExperienceItem[];
  petProjects: PetProject[];
  cta: {
    resumeHref: string;
    googleDocHref: string;
    resumeLabel: string;
    googleDocLabel: string;
  };
}

const googleDocUrl = 'https://docs.google.com/document/d/e/2PACX-1vSh-WOFGscYRkZQk6qin7YGzGQragYp44kA3OtN2tDSwowyk6IkdPw2WUzlALnxrqByJ2rPaBoo6EVZ/pub';

export const resumeShortRu: ResumeShort = {
  name: 'Калимуллин Родион Данирович',
  title: 'Senior Full-Stack Developer / Tech Lead / DevOps',
  experience: '~20 лет',
  workFormat: 'Full-time / Contract / Remote / Hybrid',
  location: 'Россия',
  highlights: [
    'Senior Full-Stack разработчик с 20-летним коммерческим опытом + сильная экспертиза backend/frontend/DevOps/архитектура',
    'Опыт: стартапы (MVP → prod), финтех/банк (enterprise microservices), игровая индустрия (online/highload)',
    'Архитектура с нуля, координация команд, hands-on разработка, довожу до production и масштабирую',
    'Активно использую AI-инструменты для ускорения delivery и повышения качества',
  ],
  keySpecialization: [
    'Senior Full-Stack Development',
    'Microservices / Enterprise systems',
    'DevOps & Infrastructure',
    'Техническое лидерство',
    'Стартапы и бизнес-проекты',
    'Высоконагруженные системы',
  ],
  stackChips: [
    'PHP', 'Java', 'Node.js', 'Go',
    'React', 'Angular', 'Vue',
    'PostgreSQL', 'MySQL', 'Redis',
    'Docker', 'Linux', 'CI/CD',
  ],
  stackDetails: [
    { section: 'Backend', items: ['PHP', 'Java', 'Node.js', 'Go', 'REST/API/Microservices'] },
    { section: 'Frontend', items: ['React', 'Angular', 'Vue.js'] },
    { section: 'DB/Cache', items: ['PostgreSQL', 'MySQL', 'Redis', 'Memcached'] },
    { section: 'Queues', items: ['RabbitMQ'] },
    { section: 'DevOps', items: ['Linux', 'Docker', 'Nginx', 'CI/CD'] },
    { section: 'Observability', items: ['Elasticsearch', 'Kibana', 'Grafana'] },
    { section: 'AI tools', items: ['Qoder', 'Kilo AI', 'Cursor AI', 'Claude Code'] },
  ],
  experienceShort: [
    {
      company: 'Хоум Банк',
      role: 'Full-Stack Developer',
      bullets: ['Микросервисы, критичные сервисы, мониторинг, Jira/Confluence'],
    },
    {
      company: 'Forward LLC',
      role: 'Senior Full-Stack/DevOps',
      bullets: ['Стартап, архитектура, деплой, оптимизация'],
    },
    {
      company: 'Authentica',
      role: 'Senior Full-Stack',
      bullets: ['Full-stack продукт, стартап'],
    },
    {
      company: 'Игровая индустрия',
      role: 'Lead/Tech Lead',
      bullets: ['TownWars, Avangard Online, "Пилиция"'],
    },
  ],
  petProjects: [
    { name: 'reader.market', bullets: ['AI-платформа для книг'] },
    { name: 'cyka.lol', bullets: ['Фан/экспериментальный проект'] },
  ],
  cta: {
    resumeHref: '/ru/resume',
    googleDocHref: googleDocUrl,
    resumeLabel: 'Полное резюме',
    googleDocLabel: 'Google Docs',
  },
};

export const resumeShortEn: ResumeShort = {
  name: 'Rodion Kalimullin',
  title: 'Senior Full-Stack Developer / Tech Lead / DevOps',
  experience: '~20 years',
  workFormat: 'Full-time / Contract / Remote / Hybrid',
  location: 'Russia',
  highlights: [
    'Senior Full-Stack developer with 20 years of commercial experience + strong expertise in backend/frontend/DevOps/architecture',
    'Experience: startups (MVP → prod), fintech/banking (enterprise microservices), gaming industry (online/highload)',
    'Architecture from scratch, team coordination, hands-on development, deliver to production and scale',
    'Actively using AI tools to accelerate delivery and improve quality',
  ],
  keySpecialization: [
    'Senior Full-Stack Development',
    'Microservices / Enterprise systems',
    'DevOps & Infrastructure',
    'Technical leadership',
    'Startups and business projects',
    'High-load systems',
  ],
  stackChips: [
    'PHP', 'Java', 'Node.js', 'Go',
    'React', 'Angular', 'Vue',
    'PostgreSQL', 'MySQL', 'Redis',
    'Docker', 'Linux', 'CI/CD',
  ],
  stackDetails: [
    { section: 'Backend', items: ['PHP', 'Java', 'Node.js', 'Go', 'REST/API/Microservices'] },
    { section: 'Frontend', items: ['React', 'Angular', 'Vue.js'] },
    { section: 'DB/Cache', items: ['PostgreSQL', 'MySQL', 'Redis', 'Memcached'] },
    { section: 'Queues', items: ['RabbitMQ'] },
    { section: 'DevOps', items: ['Linux', 'Docker', 'Nginx', 'CI/CD'] },
    { section: 'Observability', items: ['Elasticsearch', 'Kibana', 'Grafana'] },
    { section: 'AI tools', items: ['Qoder', 'Kilo AI', 'Cursor AI', 'Claude Code'] },
  ],
  experienceShort: [
    {
      company: 'Home Bank',
      role: 'Full-Stack Developer',
      bullets: ['Microservices, critical services, monitoring, Jira/Confluence'],
    },
    {
      company: 'Forward LLC',
      role: 'Senior Full-Stack/DevOps',
      bullets: ['Startup, architecture, deployment, optimization'],
    },
    {
      company: 'Authentica',
      role: 'Senior Full-Stack',
      bullets: ['Full-stack product, startup'],
    },
    {
      company: 'Gaming Industry',
      role: 'Lead/Tech Lead',
      bullets: ['TownWars, Avangard Online, "Pilicia"'],
    },
  ],
  petProjects: [
    { name: 'reader.market', bullets: ['AI book platform'] },
    { name: 'cyka.lol', bullets: ['Fan/experimental project'] },
  ],
  cta: {
    resumeHref: '/en/resume',
    googleDocHref: googleDocUrl,
    resumeLabel: 'Full Resume',
    googleDocLabel: 'Google Docs',
  },
};
