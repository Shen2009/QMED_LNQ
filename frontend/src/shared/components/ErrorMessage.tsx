import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../core/theme/ThemeContext';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({message}) => {
  const {theme} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.error + '18',
          borderColor: theme.colors.error + '55',
        },
      ]}>
      <Text style={[styles.text, {color: theme.colors.error}]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ErrorMessage;
