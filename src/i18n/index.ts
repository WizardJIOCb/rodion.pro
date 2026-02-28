export const languages = {
  ru: 'Русский',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'ru';

export const ui = {
  ru: {
    // Navigation
    'nav.home': 'Главная',
    'nav.projects': 'Проекты',
    'nav.blog': 'Блог',
    'nav.changelog': 'Журнал изменений',
    'nav.now': 'Сейчас',
    'nav.activity': 'Активность',
    'nav.resume': 'Резюме',
    'nav.contact': 'Контакты',
    'nav.uses': 'Инструменты',
    
    // Activity dashboard
    'activity.title': 'Панель активности',
    'activity.description': 'Панель мониторинга активности в реальном времени',
    'activity.now': 'Сейчас',
    'activity.todayTotals': 'Сегодня Всего',
    'activity.timeline': 'Хронология активности',
    'activity.topApps': 'Топ Приложений',
    'activity.topCategories': 'Категории использования',
    'activity.detailedAnalysis': 'Детальный анализ',
    'activity.mostUsed': 'Чаще всего',
    'activity.leastUsed': 'Реже всего',
    'activity.productivity': 'Продуктивность',
    'activity.codingTime': 'Время кодинга',
    'activity.communication': 'Коммуникации',
    'activity.browserTime': 'Время в браузере',
    'activity.application': 'Приложение',
    'activity.time': 'Время',
    'activity.category': 'Категория',
    'activity.keys': 'Клавиши',
    'activity.clicks': 'Клики',
    'activity.scrolls': 'Прокрутки',
    'activity.activeTime': 'Активное время',
    'activity.status': 'Статус',
    'activity.activeApp': 'Активное приложение',
    'activity.lastUpdate': 'Последнее обновление',
    'activity.todayActive': 'Активность сегодня',
    'activity.idle': 'Неактивен',
    'activity.unknown': 'Неизвестно',
    'activity.showingHours': 'Показано {count} часов активности',
    
    // Hero
    'hero.greeting': 'Привет, я',
    'hero.name': 'Rodion',
    'hero.tagline': 'Разработчик, DevOps, AI энтузиаст',
    'hero.cta': 'Исследовать проекты',
    
    // Sections
    'section.featured': 'Избранные проекты',
    'section.latest': 'Последние записи',
    'section.events': 'Последние события',
    'section.viewAll': 'Смотреть все',
    
    // Blog
    'blog.title': 'Блог',
    'blog.description': 'Заметки о разработке, DevOps и технологиях',
    'blog.readMore': 'Читать далее',
    'blog.publishedOn': 'Опубликовано',
    'blog.tags': 'Теги',
    'blog.allPosts': 'Все записи',
    
    // Projects
    'projects.title': 'Проекты',
    'projects.description': 'Мои текущие и завершённые проекты',
    'projects.status.active': 'Активный',
    'projects.status.paused': 'На паузе',
    'projects.status.archived': 'В архиве',
    'projects.viewSite': 'Сайт',
    'projects.viewGithub': 'GitHub',
    'projects.viewDemo': 'Демо',
    
    // Changelog
    'changelog.title': 'Changelog',
    'changelog.description': 'История изменений и событий',
    'changelog.loadMore': 'Загрузить ещё',
    
    // Comments
    'comments.title': 'Комментарии',
    'comments.placeholder': 'Напишите комментарий...',
    'comments.submit': 'Отправить',
    'comments.login': 'Войти через Google',
    'comments.loginPrompt': 'Войдите, чтобы оставить комментарий',
    'comments.reply': 'Ответить',
    'comments.replies': 'replies',
    'comments.edited': 'изменён',
    'comments.deleted': 'Комментарий удалён',
    'comments.report': 'Пожаловаться',
    
    // Auth
    'auth.continueWith': 'Продолжить с Google',
    'auth.logout': 'Выйти',
    'auth.loggedAs': 'Вы вошли как',
    
    // Footer
    'footer.rights': 'Все права защищены',
    'footer.builtWith': 'Создано с',
    
    // Command palette
    'cmd.placeholder': 'Введите команду или поиск...',
    'cmd.noResults': 'Ничего не найдено',
    'cmd.navigation': 'Навигация',
    'cmd.theme': 'Тема',
    'cmd.language': 'Язык',
    
    // Theme names
    'theme.soft-neon-teal': 'Soft Neon Teal',
    'theme.violet-rain': 'Violet Rain',
    'theme.amber-terminal': 'Amber Terminal',
    'theme.ice-cyan': 'Ice Cyan',
    'theme.mono-green': 'Mono Green',
    
    // Misc
    'misc.search': 'Поиск',
    'misc.loading': 'Загрузка...',
    'misc.error': 'Ошибка',
    'misc.notFound': 'Страница не найдена',
    'misc.backHome': 'На главную',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.blog': 'Blog',
    'nav.changelog': 'Changelog',
    'nav.now': 'Now',
    'nav.activity': 'Activity',
    'nav.resume': 'Resume',
    'nav.contact': 'Contact',
    'nav.uses': 'Uses',
    
    // Activity dashboard
    'activity.title': 'Activity Dashboard',
    'activity.description': 'Real-time activity monitoring dashboard',
    'activity.now': 'Now',
    'activity.todayTotals': "Today's Totals",
    'activity.timeline': 'Activity Timeline',
    'activity.topApps': 'Top Applications',
    'activity.topCategories': 'Usage by Category',
    'activity.detailedAnalysis': 'Detailed Analysis',
    'activity.mostUsed': 'Most Used',
    'activity.leastUsed': 'Least Used',
    'activity.productivity': 'Productivity',
    'activity.codingTime': 'Coding Time',
    'activity.communication': 'Communication',
    'activity.browserTime': 'Browser Time',
    'activity.application': 'Application',
    'activity.time': 'Time',
    'activity.category': 'Category',
    'activity.keys': 'Keys',
    'activity.clicks': 'Clicks',
    'activity.scrolls': 'Scrolls',
    'activity.activeTime': 'Active Time',
    'activity.status': 'Status',
    'activity.activeApp': 'Active App',
    'activity.lastUpdate': 'Last Update',
    'activity.todayActive': 'Today Active',
    'activity.idle': 'Idle',
    'activity.unknown': 'Unknown',
    'activity.showingHours': 'Showing {count} hours of activity',
    
    // Hero
    'hero.greeting': "Hi, I'm",
    'hero.name': 'Rodion',
    'hero.tagline': 'Developer, DevOps, AI enthusiast',
    'hero.cta': 'Explore projects',
    
    // Sections
    'section.featured': 'Featured Projects',
    'section.latest': 'Latest Posts',
    'section.events': 'Recent Events',
    'section.viewAll': 'View all',
    
    // Blog
    'blog.title': 'Blog',
    'blog.description': 'Notes on development, DevOps and technology',
    'blog.readMore': 'Read more',
    'blog.publishedOn': 'Published on',
    'blog.tags': 'Tags',
    'blog.allPosts': 'All posts',
    
    // Projects
    'projects.title': 'Projects',
    'projects.description': 'My current and completed projects',
    'projects.status.active': 'Active',
    'projects.status.paused': 'Paused',
    'projects.status.archived': 'Archived',
    'projects.viewSite': 'Site',
    'projects.viewGithub': 'GitHub',
    'projects.viewDemo': 'Demo',
    
    // Changelog
    'changelog.title': 'Changelog',
    'changelog.description': 'History of changes and events',
    'changelog.loadMore': 'Load more',
    
    // Comments
    'comments.title': 'Comments',
    'comments.placeholder': 'Write a comment...',
    'comments.submit': 'Submit',
    'comments.login': 'Sign in with Google',
    'comments.loginPrompt': 'Sign in to leave a comment',
    'comments.reply': 'Reply',
    'comments.replies': 'replies',
    'comments.edited': 'edited',
    'comments.deleted': 'Comment deleted',
    'comments.report': 'Report',
    
    // Auth
    'auth.continueWith': 'Continue with Google',
    'auth.logout': 'Sign out',
    'auth.loggedAs': 'Signed in as',
    
    // Footer
    'footer.rights': 'All rights reserved',
    'footer.builtWith': 'Built with',
    
    // Command palette
    'cmd.placeholder': 'Type a command or search...',
    'cmd.noResults': 'No results found',
    'cmd.navigation': 'Navigation',
    'cmd.theme': 'Theme',
    'cmd.language': 'Language',
    
    // Theme names
    'theme.soft-neon-teal': 'Soft Neon Teal',
    'theme.violet-rain': 'Violet Rain',
    'theme.amber-terminal': 'Amber Terminal',
    'theme.ice-cyan': 'Ice Cyan',
    'theme.mono-green': 'Mono Green',
    
    // Misc
    'misc.search': 'Search',
    'misc.loading': 'Loading...',
    'misc.error': 'Error',
    'misc.notFound': 'Page not found',
    'misc.backHome': 'Back to home',
  },
} as const;

export type TranslationKey = keyof typeof ui.ru;

export function getLangFromUrl(url: URL): Lang {
  const parts = url.pathname.split('/');
  const lang = parts[1];
  if (lang && lang in languages) {
    return lang as Lang;
  }
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey): string {
    return ui[lang][key] || ui[defaultLang][key] || key;
  };
}

export function getLocalizedPath(path: string, lang: Lang): string {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(ru|en)/, '');
  return `/${lang}${cleanPath || '/'}`;
}

export function getAlternateLocales(currentPath: string, currentLang: Lang) {
  const cleanPath = currentPath.replace(/^\/(ru|en)/, '');
  return Object.keys(languages)
    .filter((lang) => lang !== currentLang)
    .map((lang) => ({
      lang: lang as Lang,
      path: `/${lang}${cleanPath || '/'}`,
    }));
}
