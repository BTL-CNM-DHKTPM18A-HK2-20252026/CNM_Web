// src/themes/index.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import light from './light';
import dark from './dark';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  const getThemeObject = (themeName) => {
    if (themeName === 'grayscale') return grayscale;
    if (themeName === 'dark') return dark;
    return light;
  };

  const [theme, setTheme] = useState(getThemeObject(currentTheme));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (themeName) => {
      let activeTheme = themeName;
      if (themeName === 'system') {
        activeTheme = mediaQuery.matches ? 'dark' : 'light';
      }

      const themeObj = getThemeObject(activeTheme);
      setTheme(themeObj);

      // Inject CSS variables for backward compatibility and styling ease
      const root = document.documentElement;
      Object.keys(themeObj).forEach(key => {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, themeObj[key]);
      });

      // Manage .dark class for tailwind primitives
      if (activeTheme === 'dark' || activeTheme === 'grayscale') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);

    if (currentTheme === 'system') {
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setCurrentTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
