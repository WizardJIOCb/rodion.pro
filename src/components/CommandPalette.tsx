import { useState, useEffect, useCallback, useRef } from 'react';

interface Props {
  lang: 'ru' | 'en';
}

interface CommandItem {
  id: string;
  label: string;
  action: () => void;
  group: string;
  keywords?: string[];
}

export default function CommandPalette({ lang }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = {
    placeholder: lang === 'ru' ? 'Введите команду...' : 'Type a command...',
    navigation: lang === 'ru' ? 'Навигация' : 'Navigation',
    theme: lang === 'ru' ? 'Тема' : 'Theme',
    noResults: lang === 'ru' ? 'Ничего не найдено' : 'No results',
  };

  const navigationItems: CommandItem[] = [
    { id: 'activity', label: lang === 'ru' ? 'Активность' : 'Activity', action: () => navigate('/activity'), group: t.navigation, keywords: ['activity', 'активность', 'dashboard'] },
    { id: 'home', label: lang === 'ru' ? 'Главная' : 'Home', action: () => navigate('/'), group: t.navigation, keywords: ['home', 'главная'] },    
    { id: 'projects', label: lang === 'ru' ? 'Проекты' : 'Projects', action: () => navigate('/projects'), group: t.navigation, keywords: ['projects', 'проекты'] },
    { id: 'blog', label: lang === 'ru' ? 'Блог' : 'Blog', action: () => navigate('/blog'), group: t.navigation, keywords: ['blog', 'блог', 'posts'] },
    { id: 'changelog', label: 'Changelog', action: () => navigate('/changelog'), group: t.navigation, keywords: ['changelog', 'events', 'история'] },
    { id: 'now', label: 'Now', action: () => navigate('/now'), group: t.navigation, keywords: ['now', 'сейчас'] },
    { id: 'uses', label: 'Uses', action: () => navigate('/uses'), group: t.navigation, keywords: ['uses', 'tools', 'инструменты'] },
    { id: 'resume', label: lang === 'ru' ? 'Резюме' : 'Resume', action: () => navigate('/resume'), group: t.navigation, keywords: ['resume', 'резюме', 'cv'] },    
    { id: 'contact', label: lang === 'ru' ? 'Контакт' : 'Contact', action: () => navigate('/contact'), group: t.navigation, keywords: ['contact', 'контакт', 'email'] },
  ];

  const themeItems: CommandItem[] = [
    { id: 'theme-soft', label: 'Soft Neon Teal', action: () => setTheme('soft-neon-teal'), group: t.theme },
    { id: 'theme-violet', label: 'Violet Rain', action: () => setTheme('violet-rain'), group: t.theme },
    { id: 'theme-amber', label: 'Amber Terminal', action: () => setTheme('amber-terminal'), group: t.theme },
    { id: 'theme-ice', label: 'Ice Cyan', action: () => setTheme('ice-cyan'), group: t.theme },
    { id: 'theme-green', label: 'Mono Green', action: () => setTheme('mono-green'), group: t.theme },
  ];

  const allItems = [...navigationItems, ...themeItems];

  const filteredItems = query
    ? allItems.filter(item => {
        const searchStr = `${item.label} ${item.keywords?.join(' ') || ''}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
      })
    : allItems;

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const navigate = useCallback((path: string) => {
    window.location.href = `/${lang}${path}`;
    setIsOpen(false);
  }, [lang]);

  const setTheme = useCallback((theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.altKey && e.code === 'KeyK') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filteredItems[selectedIndex]?.action();
    }
  }, [isOpen, filteredItems, selectedIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-command-palette', handler);
    return () => window.removeEventListener('toggle-command-palette', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div className="relative max-w-xl mx-auto mt-[20vh]">
        <div className="bg-surface border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 py-4 bg-transparent text-text placeholder-muted
                         focus:outline-none"
            />
            <kbd className="px-2 py-1 text-xs text-muted bg-surface2 rounded border border-border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-8 text-center text-muted text-sm">
                {t.noResults}
              </div>
            ) : (
              Object.entries(groupedItems).map(([group, items]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-3 py-1 text-xs font-medium text-muted uppercase tracking-wider">
                    {group}
                  </div>
                  {items.map((item) => {
                    const itemIndex = flatIndex++;
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`
                          w-full px-3 py-2 rounded-md text-left text-sm
                          flex items-center gap-3 transition-colors
                          ${isSelected ? 'bg-accent/10 text-accent' : 'text-text hover:bg-surface2'}
                        `}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface2 rounded border border-border">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface2 rounded border border-border">↓</kbd>
                <span className="ml-1">{lang === 'ru' ? 'навигация' : 'navigate'}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface2 rounded border border-border">↵</kbd>
                <span className="ml-1">{lang === 'ru' ? 'выбрать' : 'select'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
