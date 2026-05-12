import { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';

export function useTheme() {
  const { theme, toggleTheme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, toggleTheme };
}
