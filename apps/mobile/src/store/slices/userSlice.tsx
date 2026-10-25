import {createAction, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {UserType} from '../../types/UserType';
import type {SessionType} from '../../types/SessionType';

type UserState = {user: UserType | null; rememberMe: boolean};

const initialState: UserState = {user: null, rememberMe: false};

/** Login or sign-up succeeded: this slice keeps the user, authSlice the tokens. */
export const startSession = createAction<SessionType>('auth/startSession');

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserType>) => {
      state.user = action.payload;
    },
    logOut: (state) => {
      state.user = null;
      state.rememberMe = false;
    },
    setRememberMe: (state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(startSession, (state, action) => {
      state.user = action.payload.user;
    });
  },
});

export const {setUser, logOut, setRememberMe} = userSlice.actions;

export {userSlice};
