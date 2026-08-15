import {configureStore} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import appReducer from './slices/appSlice';

const appPersistConfig = {
  key: 'app',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['onboardingDone', 'languageSelectDone'],
};

const persistedAppReducer  = persistReducer(appPersistConfig, appReducer);

export const store = configureStore({
  reducer: {
    app:         persistedAppReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
