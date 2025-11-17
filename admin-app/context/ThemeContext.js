// context/ThemeContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load theme preference from storage
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePreference');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('themePreference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      // Background colors - Improved contrast for dark mode
      background: isDarkMode ? '#0A0F1C' : '#F5F7FA', // Darker background for better text contrast
      surface: isDarkMode ? '#1A2332' : '#FFFFFF', // Lighter surface for better contrast
      card: isDarkMode ? '#243447' : '#FFFFFF', // Slightly lighter cards
      
      // Text colors - Improved contrast for dark mode readability
      text: isDarkMode ? '#FFFFFF' : '#0F172A', // Pure white in dark mode for better contrast
      textSecondary: isDarkMode ? '#E2E8F0' : '#64748B', // Lighter in dark mode
      textTertiary: isDarkMode ? '#CBD5E1' : '#94A3B8', // Even lighter for tertiary text
      textInverse: isDarkMode ? '#0F172A' : '#FFFFFF', // Inverse for dark backgrounds
      
      // Primary colors (purple)
      primary: '#6B46C1',
      primaryLight: isDarkMode ? '#8B5CF6' : '#7C3AED',
      primaryDark: '#5B21B6',
      
      // Border colors - Better visibility in dark mode
      border: isDarkMode ? '#2D3A4F' : '#E2E8F0',
      borderLight: isDarkMode ? '#3A4A5F' : '#F1F5F9',
      
      // Status colors
      success: isDarkMode ? '#10B981' : '#059669',
      error: isDarkMode ? '#EF4444' : '#DC2626',
      warning: isDarkMode ? '#F59E0B' : '#D97706',
      info: isDarkMode ? '#3B82F6' : '#2563EB',
      
      // Shadow/Elevation
      shadow: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      
      // Input colors
      inputBackground: isDarkMode ? '#1E293B' : '#FFFFFF',
      inputBorder: isDarkMode ? '#475569' : '#E2E8F0',
      
      // Header colors
      header: isDarkMode ? '#1E293B' : '#6B46C1',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 40,
    },
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      full: 9999,
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

