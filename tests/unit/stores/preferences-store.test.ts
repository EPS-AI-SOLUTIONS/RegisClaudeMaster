import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferencesStore } from '../../../src/lib/preferences-store';

describe('preferences-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePreferencesStore.setState({
      theme: 'dark',
      language: 'pl',
    });
  });

  describe('initial state', () => {
    it('has dark theme by default', () => {
      const { theme } = usePreferencesStore.getState();
      expect(theme).toBe('dark');
    });

    it('has Polish language by default', () => {
      const { language } = usePreferencesStore.getState();
      expect(language).toBe('pl');
    });
  });

  describe('setTheme', () => {
    it('changes theme to light', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('light');

      const { theme } = usePreferencesStore.getState();
      expect(theme).toBe('light');
    });

    it('changes theme to dark', () => {
      usePreferencesStore.setState({ theme: 'light' });
      const { setTheme } = usePreferencesStore.getState();

      setTheme('dark');

      const { theme } = usePreferencesStore.getState();
      expect(theme).toBe('dark');
    });

    it('allows toggling theme multiple times', () => {
      const { setTheme } = usePreferencesStore.getState();

      setTheme('light');
      expect(usePreferencesStore.getState().theme).toBe('light');

      setTheme('dark');
      expect(usePreferencesStore.getState().theme).toBe('dark');

      setTheme('light');
      expect(usePreferencesStore.getState().theme).toBe('light');
    });
  });

  describe('setLanguage', () => {
    it('changes language to English', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('en');

      const { language } = usePreferencesStore.getState();
      expect(language).toBe('en');
    });

    it('changes language to Polish', () => {
      usePreferencesStore.setState({ language: 'en' });
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('pl');

      const { language } = usePreferencesStore.getState();
      expect(language).toBe('pl');
    });

    it('allows toggling language multiple times', () => {
      const { setLanguage } = usePreferencesStore.getState();

      setLanguage('en');
      expect(usePreferencesStore.getState().language).toBe('en');

      setLanguage('pl');
      expect(usePreferencesStore.getState().language).toBe('pl');

      setLanguage('en');
      expect(usePreferencesStore.getState().language).toBe('en');
    });
  });

  describe('combined state changes', () => {
    it('can change both theme and language independently', () => {
      const { setTheme, setLanguage } = usePreferencesStore.getState();

      setTheme('light');
      setLanguage('en');

      const state = usePreferencesStore.getState();
      expect(state.theme).toBe('light');
      expect(state.language).toBe('en');
    });

    it('maintains state consistency after multiple changes', () => {
      const { setTheme, setLanguage } = usePreferencesStore.getState();

      setTheme('light');
      setLanguage('en');
      setTheme('dark');

      const state = usePreferencesStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.language).toBe('en');
    });
  });
});
