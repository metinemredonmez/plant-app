import type {UserType} from './UserType';

// What login and sign-up return: the user plus a short-lived access token
// and a refresh token that is exchanged for a new pair when it expires.
export type TokenPairType = {
  token: string;
  refreshToken: string;
};

export type SessionType = TokenPairType & {
  user: UserType;
};
