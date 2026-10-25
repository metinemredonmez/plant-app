import {createSlice, PayloadAction} from '@reduxjs/toolkit';

import {logOut, startSession} from './userSlice';
import type {TokenPairType} from '../../types/SessionType';

// Persisted to the iOS Keychain / Android Keystore (see store/secureStorage),
// never to AsyncStorage.
type AuthState = {token: string | null; refreshToken: string | null};

const initialState: AuthState = {token: null, refreshToken: null};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (state, action: PayloadAction<TokenPairType>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(startSession, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(logOut, () => initialState);
  },
});

export const {setTokens} = authSlice.actions;
