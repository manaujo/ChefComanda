import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextData {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem(`theme_${user?.id}`);
    if (savedTheme) {
      setTheme(savedTheme as ThemeMode);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    if (user?.id) {
      localStorage.setItem(`theme_${user.id}`, newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};