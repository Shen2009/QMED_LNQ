import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {lightTheme, darkTheme, Theme} from './theme';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [isDark, setIsDark] = useState(false);

  // Overlay opacity: flashes white/black briefly during theme switch
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Track previous dark state to determine overlay colour
  const prevIsDarkRef = useRef(isDark);

  const toggleTheme = () => {
    // 1. Fade overlay IN (0 → 1)
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      // 2. Swap theme at peak opacity (invisible transition)
      setIsDark(prev => {
        prevIsDarkRef.current = prev;
        return !prev;
      });
      // 3. Fade overlay OUT (1 → 0)
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const theme = isDark ? darkTheme : lightTheme;

  // Overlay colour: going dark→light use white, light→dark use black
  const overlayColor = isDark ? '#000000' : '#FFFFFF';

  return (
    <ThemeContext.Provider value={{theme, isDark, toggleTheme}}>
      <View style={styles.flex}>
        {children}
        {/* Transition overlay — sits on top of everything, pointer-events none */}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, {backgroundColor: overlayColor, opacity: overlayOpacity}]}
        />
      </View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
