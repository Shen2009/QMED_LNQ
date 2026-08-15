import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../core/theme/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const {theme} = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, {color: theme.colors.text}]}>{label}</Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.cardLight,
            borderColor: error ? theme.colors.error : theme.colors.border,
            color: theme.colors.text,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.placeholder}
        {...props}
      />
      {error && (
        <Text style={[styles.error, {color: theme.colors.error}]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
