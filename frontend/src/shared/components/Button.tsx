import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import {useTheme} from '../../core/theme/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const {theme} = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      bg: theme.colors.primary,
      border: theme.colors.primary,
      text: '#FFFFFF',
    },
    secondary: {
      bg: theme.colors.cardLight,
      border: theme.colors.border,
      text: theme.colors.text,
    },
    outline: {
      bg: 'transparent',
      border: theme.colors.primary,
      text: theme.colors.primary,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: theme.colors.textSecondary,
    },
    danger: {
      bg: theme.colors.error,
      border: theme.colors.error,
      text: '#FFFFFF',
    },
  }[variant];

  const buttonStyle: ViewStyle = {
    backgroundColor: isDisabled ? theme.colors.disabled : palette.bg,
    borderColor: isDisabled ? theme.colors.disabled : palette.border,
  };
  const contentColor = isDisabled ? theme.colors.placeholder : palette.text;

  const renderedIcon = icon ? (
    <MaterialIcons name={icon} size={19} color={contentColor} />
  ) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, buttonStyle, style]}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'left' && renderedIcon}
          <Text style={[styles.text, {color: contentColor}, textStyle]} numberOfLines={1}>
            {title}
          </Text>
          {iconPosition === 'right' && renderedIcon}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  content: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default Button;
