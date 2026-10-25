import type { User } from '../generated/prisma/client.js';

/**
 * The user object the app keeps in Redux and AsyncStorage. It must never
 * carry the password hash, role or any other server-only field.
 */
export const toLegacyUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  location: user.location,
  phoneNumber: user.phoneNumber,
  phoneVerified: user.phoneVerified,
  emailVerified: user.emailVerified,
});
