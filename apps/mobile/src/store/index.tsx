import {
  configureStore,
  combineReducers,
  createListenerMiddleware,
  type UnknownAction,
} from '@reduxjs/toolkit';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';
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

import {secureStorage} from './secureStorage';
import {apiSlice} from './slices/apiSlice';
import {tabSlice} from './slices/tabSlice';
import {tagSlice} from './slices/tagSlice';
import {authSlice} from './slices/authSlice';
import {logOut, userSlice} from './slices/userSlice';
import {cartSlice} from './slices/cartSlice';
import {startSlice} from './slices/startSlice';
import {filterSlice} from './slices/filterSlice';
import {paymentSlice} from './slices/paymentSlice';
import {versionSlice} from './slices/versionSlice';
import {wishlistSlice} from './slices/wishlistSlice';
import {promocodeSlice} from './slices/promocodeSlice';
import {attachStore, revokeSession} from '../api/client';

const appReducer = combineReducers({
  tabSlice: tabSlice.reducer,
  tagSlice: tagSlice.reducer,
  apiSlice: apiSlice.reducer,
  // Tokens live in secure storage, apart from the AsyncStorage root.
  authSlice: persistReducer(
    {key: 'auth', storage: secureStorage},
    authSlice.reducer,
  ),
  userSlice: userSlice.reducer,
  cartSlice: cartSlice.reducer,
  startSlice: startSlice.reducer,
  filterSlice: filterSlice.reducer,
  versionSlice: versionSlice.reducer,
  paymentSlice: paymentSlice.reducer,
  wishlistSlice: wishlistSlice.reducer,
  promocodeSlice: promocodeSlice.reducer,
});

// Logging out forgets everything that belongs to the account, so the next
// person on the device does not inherit a cart, wishlist or card details.
// authSlice clears itself (it has its own persistence); onboarding stays.
const ACCOUNT_SLICES = [
  'userSlice',
  'cartSlice',
  'paymentSlice',
  'wishlistSlice',
  'promocodeSlice',
] as const;

const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: UnknownAction,
) => {
  if (state && logOut.match(action)) {
    const kept: Partial<ReturnType<typeof appReducer>> = {...state};
    ACCOUNT_SLICES.forEach(key => delete kept[key]);
    return appReducer(kept as ReturnType<typeof appReducer>, action);
  }
  return appReducer(state, action);
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: [
    'tabSlice',
    'userSlice',
    'cartSlice',
    'startSlice',
    'versionSlice',
    'paymentSlice',
    'wishlistSlice',
    'promocodeSlice',
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// On logout: end the session on the server and drop cached API data.
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: logOut,
  effect: (_action, api) => {
    const before = api.getOriginalState() as ReturnType<typeof appReducer>;
    revokeSession(before.authSlice.refreshToken);
    api.dispatch(apiSlice.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(listener.middleware)
      .concat(apiSlice.middleware),
});

attachStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const persistor = persistStore(store);
