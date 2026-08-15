import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import {useTheme} from '../../core/theme/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const {theme} = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (disabled) {
      return {...baseStyle, backgroundColor: theme.colors.disabled};
    }

    switch (variant) {
      case 'primary':
        return {...baseStyle, backgroundColor: theme.colors.primary};
      case 'secondary':
        return {...baseStyle, backgroundColor: theme.colors.cardLight};
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: 16,
      fontWeight: '600',
    };

    if (disabled) {
      return {...baseStyle, color: theme.colors.placeholder};
    }

    switch (variant) {
      case 'primary':
        return {...baseStyle, color: '#FFFFFF'};
      case 'secondary':
        return {...baseStyle, color: theme.colors.text};
      case 'outline':
        return {...baseStyle, color: theme.colors.primary};
      default:
        return baseStyle;
    }
  };

  const renderButtonContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary}
        />
      );
    }

    return <Text style={[getTextStyle(), textStyle]}>{title}</Text>;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {variant === 'primary' ? (
        <View style={[styles.primaryGlow, {borderRadius: theme.borderRadius.md}]}>
          {renderButtonContent()}
        </View>
      ) : (
        renderButtonContent()
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryGlow: {
    shadowColor: '#0A84FF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
  },
});

export default Button;
