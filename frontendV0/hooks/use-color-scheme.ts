import { useState, useEffect } from 'react';
import { Appearance } from 'react-native';

type ColorSchemeName = 'light' | 'dark' | null | undefined;

interface UseColorSchemeResult {
  colorScheme: ColorSchemeName;
  toggleColorScheme: () => void;
}

export function useColorScheme(): UseColorSchemeResult {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const toggleColorScheme = () => {
    setColorScheme((prevScheme) => (prevScheme === 'dark' ? 'light' : 'dark'));
  };

  return { colorScheme, toggleColorScheme };
}