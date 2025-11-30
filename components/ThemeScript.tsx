'use client';

import { useEffect } from 'react';

export default function ThemeScript() {
  useEffect(() => {
    // This runs on mount to set initial theme
    const stored = localStorage.getItem('portfolio-theme');
    const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return null;
}
