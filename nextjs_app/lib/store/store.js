import { configureStore, combineReducers } from '@reduxjs/toolkit';
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
import storage from 'redux-persist/lib/storage';
import projectReducer from './features/projectSlice';
import layerReducer from './features/layerSlice';
import chatReducer from './features/chatSlice';

const chatPersistConfig = {
  key: 'chat',
  storage,
  blacklist: ['isLoading'], // in-flight flag must not survive page refresh
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['project', 'layer', 'chat'],
};

const rootReducer = combineReducers({
  project: projectReducer,
  layer: layerReducer,
  chat: persistReducer(chatPersistConfig, chatReducer),
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
