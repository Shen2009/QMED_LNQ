import React from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {store, persistor} from './src/core/store/store';
import {ThemeProvider} from './src/core/theme/ThemeContext';
import {LanguageProvider} from './src/core/i18n/LanguageContext';
import AppNavigator from './src/core/navigation/AppNavigator';

export default function App() {
  // App shell note:
  // Provider order is intentionally simple: storage -> language -> theme -> routes.
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <PersistGate loading={<SimpleLoadingSpinner />} persistor={persistor}>
          <LanguageProvider>
            <ThemeProvider>
              <AppNavigator />
            </ThemeProvider>
          </LanguageProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const SimpleLoadingSpinner = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
