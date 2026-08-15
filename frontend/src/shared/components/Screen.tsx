import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {useTheme} from '../../core/theme/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  padded = true,
  style,
  contentStyle,
}) => {
  const {theme} = useTheme();
  const content = [padded ? styles.padded : null, contentStyle];

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: theme.colors.background}, style]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={content}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});

export default Screen;
