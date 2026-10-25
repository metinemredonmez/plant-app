// The endpoints the Expo app calls, as defined in apps/mobile/src/config/
// index.tsx: the template's 23 plus the two session endpoints added in week 3.
// Paths keep the legacy `/api/...` layout so both the mock server and the
// NestJS API can be checked against one list.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface LegacyEndpoint {
  /** Constant name in apps/mobile/src/config/index.tsx */
  name: string;
  method: HttpMethod;
  /** Express-style path; `:param` segments are path parameters */
  path: string;
  /** Screen or RTK Query hook that calls it */
  caller: string;
  /** Status codes the app reacts to; every success is a strict 200 */
  statuses: number[];
}

export const legacyEndpoints: LegacyEndpoint[] = [
  // RTK Query (src/store/slices/apiSlice.tsx)
  // User-scoped endpoints require the session's access token; 401 refreshes
  // the session, 403 means the id is not the caller's own.
  {name: 'GET_USER', method: 'GET', path: '/api/user/:id', caller: 'apiSlice.getUser', statuses: [200, 401, 403, 404]},
  {name: 'GET_ORDERS', method: 'GET', path: '/api/order/:userId', caller: 'apiSlice.getOrders', statuses: [200, 401, 403]},
  {name: 'GET_REVIEWS', method: 'GET', path: '/api/reviews/:plantId', caller: 'apiSlice.getReviews', statuses: [200]},
  {name: 'GET_CAROUSEL', method: 'GET', path: '/api/slides', caller: 'apiSlice.getCarousel', statuses: [200]},
  {name: 'GET_PROMOCODES', method: 'GET', path: '/api/promocodes', caller: 'apiSlice.getPromocodes', statuses: [200]},
  {name: 'GET_COLORS', method: 'GET', path: '/api/colors', caller: 'apiSlice.getColors', statuses: [200]},
  {name: 'GET_PLANTS', method: 'GET', path: '/api/plants', caller: 'apiSlice.getPlants', statuses: [200]},
  {name: 'GET_POT_TYPES', method: 'GET', path: '/api/pot/types', caller: 'apiSlice.getPotTypes', statuses: [200]},
  {name: 'GET_PLANT_TYPES', method: 'GET', path: '/api/plant/types', caller: 'apiSlice.getPlantTypes', statuses: [200]},
  {name: 'GET_BANNERS', method: 'GET', path: '/api/banners', caller: 'apiSlice.getBanners', statuses: [200]},
  {name: 'GET_CATEGORIES', method: 'GET', path: '/api/categories', caller: 'apiSlice.getCategories', statuses: [200]},

  // axios calls from screens
  {name: 'LOGIN_USER', method: 'POST', path: '/api/user/login', caller: 'SignIn, SignUpAccountCreated', statuses: [200, 401]},
  {name: 'CREATE_USER', method: 'POST', path: '/api/user/create', caller: 'SignUp', statuses: [200, 409, 422]},
  {name: 'ORDER_CREATE', method: 'POST', path: '/api/order/create', caller: 'Checkout', statuses: [200]},
  {name: 'DELETE_ACCOUNT', method: 'DELETE', path: '/api/user/delete/:id', caller: 'DeleteAccount', statuses: [200, 401, 403]},
  {name: 'CREATE_REVIEW', method: 'POST', path: '/api/review/create', caller: 'LeaveAReview', statuses: [200]},
  {name: 'GET_PROMOCODE', method: 'POST', path: '/api/promocode/show', caller: 'MyPromocodes', statuses: [200, 404]},
  {name: 'CHANGE_PASSWORD', method: 'POST', path: '/api/change/password', caller: 'NewPassword', statuses: [200]},
  {name: 'UPDATE_USER', method: 'PUT', path: '/api/user/update/:id', caller: 'EditProfile', statuses: [200, 401, 403, 422]},
  {name: 'SEND_EMAIL_OTP', method: 'POST', path: '/api/send/otp/email', caller: 'SendEmailOtp, SendEmailOtpForgot, VerifyEmail', statuses: [200]},
  {name: 'SEND_PHONE_OTP', method: 'POST', path: '/api/send/otp/phone', caller: 'SendPhoneOtp, VerifyPhone', statuses: [200]},
  {name: 'VERIFY_PHONE_OTP', method: 'POST', path: '/api/verify/otp/phone', caller: 'VerifyPhone', statuses: [200, 401]},
  {name: 'VERIFY_EMAIL_OTP', method: 'POST', path: '/api/verify/otp/email', caller: 'VerifyEmail, VerifyEmailForgot', statuses: [200, 401, 404, 422]},

  // Session endpoints (week 3), called by the app's API client
  {name: 'AUTH_REFRESH', method: 'POST', path: '/api/auth/refresh', caller: 'api client (401 retry)', statuses: [200, 401]},
  {name: 'AUTH_LOGOUT', method: 'POST', path: '/api/auth/logout', caller: 'LogOut, DeleteAccount', statuses: [200]},
];
