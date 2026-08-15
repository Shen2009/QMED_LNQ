import React, {useState} from 'react';
import {
  StyleSheet,
  StyleProp,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import {useTheme} from '../../core/theme/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  containerStyle,
  style,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}) => {
  const {theme} = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.cardLight,
            borderColor,
          },
        ]}>
        {leftIcon ? (
          <MaterialIcons
            name={leftIcon}
            size={19}
            color={focused ? theme.colors.primary : theme.colors.textMuted}
          />
        ) : null}
        <RNTextInput
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={hidden}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, {color: theme.colors.text}, style]}
          {...props}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setHidden(prev => !prev)}
            style={styles.eyeButton}>
            <MaterialIcons
              name={hidden ? 'visibility-off' : 'visibility'}
              size={19}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.feedback, {color: theme.colors.error}]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.feedback, {color: theme.colors.textMuted}]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 7,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    gap: 9,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedback: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default Input;
