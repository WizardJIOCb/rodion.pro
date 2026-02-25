import { useState, useEffect, useRef } from 'react';

const themes = [
  { id: 'soft-neon-teal', name: 'Soft Neon Teal', accent: '#38e8d6' },
  { id: 'violet-rain', name: 'Violet Rain', accent: '#b066ff' },
  { id: 'amber-terminal', name: 'Amber Terminal', accent: '#ffb74a' },
  { id: 'ice-cyan', name: 'Ice Cyan', accent: '#46e4ff' },
  { id: 'mono-green', name: 'Mono Green', accent: '#55f27d' },
] as const;

type ThemeId = (typeof themes)[number]['id'];

export default function ThemeSwitch() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('soft-neon-teal');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeId | null;
    if (stored && themes.some((t) => t.id === stored)) {
      setCurrentTheme(stored);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const selectTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem('theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    setIsOpen(false);
  };

  const current = themes.find((t) => t.id === currentTheme) || themes[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border text-sm text-muted hover:text-text hover:border-accent/50 transition-colors"
        aria-label="Switch theme"
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: current.accent }}
        />
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-surface shadow-lg z-50">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                theme.id === currentTheme
                  ? 'text-accent bg-accent/10'
                  : 'text-muted hover:text-text hover:bg-surface2'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: theme.accent }}
              />
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
