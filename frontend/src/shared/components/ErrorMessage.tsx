import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import {useTheme} from '../../core/theme/ThemeContext';

interface ErrorMessageProps {
  message: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({message, title, style}) => {
  const {theme} = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.error + '14',
          borderColor: theme.colors.error + '55',
        },
        style,
      ]}>
      <MaterialIcons name="error-outline" size={20} color={theme.colors.error} />
      <View style={styles.copy}>
        {title ? (
          <Text style={[styles.title, {color: theme.colors.error}]}>{title}</Text>
        ) : null}
        <Text style={[styles.message, {color: theme.colors.error}]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ErrorMessage;
