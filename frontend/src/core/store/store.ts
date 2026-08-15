import {configureStore} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER} from 'redux-persist';
import measurementReducer from './slices/measurementSlice';
import chatReducer from './slices/chatSlice';
import appReducer from './slices/appSlice';

const persistedAppReducer = persistReducer(
  {key: 'app', version: 1, storage: AsyncStorage, whitelist: []},
  appReducer,
);

export const store = configureStore({
  reducer: {
    app: persistedAppReducer,
    measurement: measurementReducer,
    chat: chatReducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware({
    serializableCheck: {ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]},
  }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
