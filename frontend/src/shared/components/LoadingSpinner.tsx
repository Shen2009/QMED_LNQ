import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import {useTheme} from '../../core/theme/ThemeContext';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label,
  fullScreen = true,
  style,
}) => {
  const {theme} = useTheme();

  return (
    <View style={[fullScreen ? styles.fullScreen : styles.inline, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? (
        <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default LoadingSpinner;
