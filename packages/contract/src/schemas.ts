import {z} from 'zod';

// Wire shapes the Expo app reads today. Unknown keys are allowed (the app
// ignores them), so the backend may add fields such as care attributes or a
// token without breaking anything. The rules below are the ones that do break
// the app when violated; see packages/contract/README.md.

/** Dates are printed verbatim by the app, so they travel pre-formatted. */
const displayDate = z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'GG.AA.YYYY bekleniyor');

export const userSchema = z
  .looseObject({
    id: z.number().int(),
    name: z.string(),
    email: z.string(),
    location: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    phoneVerified: z.boolean(),
    emailVerified: z.boolean(),
  })
  // The user object is persisted to AsyncStorage on the device.
  .refine(user => !('password' in user) && !('passwordHash' in user), 'Kullanıcı nesnesi parola taşıyamaz');

export const plantSchema = z
  .looseObject({
    id: z.number().int(),
    name: z.string(),
    price: z.number(),
    // ProductPrice renders `{item.oldPrice && ...}`: a 0 would leak a bare
    // "0" outside <Text> and crash, so the field is omitted when unused.
    oldPrice: z.number().positive().optional(),
    // ProductRating calls rating.toFixed(1): it must be a number.
    rating: z.number().min(0).max(5),
    image: z.string(),
    images: z.array(z.string()).min(1),
    description: z.string(),
    // Relations travel as names; the app matches with includes(name).
    categories: z.array(z.string()),
    colors: z.array(z.string()),
    potTypes: z.array(z.string()),
    plantTypes: z.array(z.string()),
    // Matched against slide/banner `promotion`; '' means none.
    promotion: z.string(),
    isBestSeller: z.boolean(),
    isFeatured: z.boolean(),
    isNew: z.boolean(),
    isTop: z.boolean(),
  })
  .refine(plant => !('oldPrice' in plant) || (plant.oldPrice ?? 0) > plant.price, 'oldPrice fiyattan büyük olmalı');

// CategoryItem falls back to a placeholder when `image` is missing.
export const categorySchema = z.looseObject({id: z.number().int(), name: z.string(), image: z.string().optional()});
export const colorSchema = z.looseObject({
  id: z.number().int(),
  name: z.string(),
  code: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export const potTypeSchema = z.looseObject({id: z.number().int(), name: z.string()});
export const plantTypeSchema = potTypeSchema;

export const bannerSchema = z.looseObject({
  id: z.number().int(),
  title: z.string(),
  title1: z.string(),
  title2: z.string(),
  image: z.string(),
  btnText: z.string(),
  promotion: z.string(),
  description1: z.string(),
  description2: z.string(),
});

export const slideSchema = z.looseObject({
  id: z.number().int(),
  image: z.string(),
  promotion: z.string(),
  title_line_1: z.string(),
  title_line_2: z.string(),
});

export const promocodeSchema = z.looseObject({
  id: z.number().int(),
  code: z.string(),
  userId: z.number().int().nullable(),
  /** Percent, applied as subtotal * (1 - discount / 100) */
  discount: z.number().int().min(1).max(100),
  expires_at: displayDate,
});

export const reviewSchema = z
  .looseObject({
    id: z.number().int(),
    name: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string(),
    createdAt: displayDate,
  })
  // Public reviews must not expose the reviewer's e-mail.
  .refine(review => !('email' in review), 'Yorumlarda e-posta yayınlanmaz');

export const orderStatusSchema = z.enum(['pending', 'processing', 'shipping', 'delivered', 'canceled']);

export const orderSchema = z.looseObject({
  id: z.number().int(),
  total: z.number(),
  delivery: z.number(),
  orderStatus: orderStatusSchema,
  createdAt: displayDate,
  products: z.array(
    z.looseObject({
      /** The PLANT id: Product.tsx compares it to decide "Leave a review" */
      id: z.number().int(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive(),
      color: z.string().optional(),
    }),
  ),
});

export const messageSchema = z.looseObject({message: z.string()});

/** Short-lived access token (Bearer) plus a rotating refresh token. */
export const tokenPairSchema = z.looseObject({token: z.string().min(1), refreshToken: z.string().min(1)});
export const sessionSchema = z.looseObject({user: userSchema, token: z.string().min(1), refreshToken: z.string().min(1)});

/** NIST SP 800-63B minimum; the app's validatePassword matches it. */
const password = z.string().min(8);

// Response bodies per endpoint name (see endpoints.ts).
export const responseSchemas = {
  GET_USER: userSchema,
  GET_ORDERS: z.looseObject({orders: z.array(orderSchema)}),
  GET_REVIEWS: z.looseObject({reviews: z.array(reviewSchema)}),
  GET_CAROUSEL: z.array(slideSchema),
  GET_PROMOCODES: z.array(promocodeSchema),
  GET_COLORS: z.array(colorSchema),
  GET_PLANTS: z.array(plantSchema),
  GET_POT_TYPES: z.array(potTypeSchema),
  GET_PLANT_TYPES: z.array(plantTypeSchema),
  GET_BANNERS: z.array(bannerSchema),
  GET_CATEGORIES: z.array(categorySchema),
  LOGIN_USER: sessionSchema,
  // Sign-up returns a session, so the app no longer carries the plain
  // password to the next screen to log in with it.
  CREATE_USER: sessionSchema,
  ORDER_CREATE: z.looseObject({order: orderSchema}),
  DELETE_ACCOUNT: messageSchema,
  CREATE_REVIEW: z.looseObject({review: reviewSchema}),
  GET_PROMOCODE: z.looseObject({promocode: promocodeSchema}),
  CHANGE_PASSWORD: messageSchema,
  UPDATE_USER: z.looseObject({user: userSchema}),
  SEND_EMAIL_OTP: messageSchema,
  SEND_PHONE_OTP: messageSchema,
  VERIFY_PHONE_OTP: z.looseObject({user: userSchema}),
  // resetToken only in the signed-out (forgot password) flow
  VERIFY_EMAIL_OTP: z.looseObject({user: userSchema, resetToken: z.string().min(1).optional()}),
  AUTH_REFRESH: tokenPairSchema,
  AUTH_LOGOUT: messageSchema,
} as const;

// Request bodies exactly as the screens send them today.
export const requestSchemas = {
  LOGIN_USER: z.object({email: z.string(), password: z.string()}),
  CREATE_USER: z.object({name: z.string().trim().min(2), email: z.email(), password}),
  ORDER_CREATE: z.object({
    name: z.string().min(1),
    total: z.number(),
    address: z.string().min(1),
    discount: z.number(),
    delivery: z.number(),
    subtotal: z.number(),
    cardHolderName: z.string(),
    products: z.array(z.looseObject({id: z.number().int(), quantity: z.number().int().positive(), color: z.string().optional()})).min(1),
    userId: z.number().int(),
    email: z.string().optional(),
    phoneNumber: z.string().nullish(),
  }),
  CREATE_REVIEW: z.object({
    comment: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    name: z.string().optional(),
    plantId: z.number().int(),
    email: z.string().optional(),
  }),
  GET_PROMOCODE: z.object({voucher: z.string().min(1)}),
  // resetToken comes from verify/otp/email; without it the API answers 401
  CHANGE_PASSWORD: z.object({email: z.string(), password, resetToken: z.string().min(1)}),
  UPDATE_USER: z.object({name: z.string().trim().min(2), location: z.string()}),
  SEND_EMAIL_OTP: z.looseObject({email: z.string()}),
  SEND_PHONE_OTP: z.object({email: z.string().optional(), phoneNumber: z.string().regex(/^\+\d{10,}$/)}),
  VERIFY_PHONE_OTP: z.object({email: z.string().optional(), phoneNumber: z.string(), otp: z.string()}),
  VERIFY_EMAIL_OTP: z.object({email: z.string(), otp: z.string()}),
  AUTH_REFRESH: z.object({refreshToken: z.string().min(1)}),
  AUTH_LOGOUT: z.object({refreshToken: z.string().min(1)}),
} as const;

export type LegacyUser = z.infer<typeof userSchema>;
export type LegacyPlant = z.infer<typeof plantSchema>;
export type LegacyCategory = z.infer<typeof categorySchema>;
export type LegacyColor = z.infer<typeof colorSchema>;
export type LegacyPotType = z.infer<typeof potTypeSchema>;
export type LegacyPlantType = z.infer<typeof plantTypeSchema>;
export type LegacyBanner = z.infer<typeof bannerSchema>;
export type LegacySlide = z.infer<typeof slideSchema>;
export type LegacyPromocode = z.infer<typeof promocodeSchema>;
export type LegacyReview = z.infer<typeof reviewSchema>;
export type LegacyOrder = z.infer<typeof orderSchema>;
export type LegacyOrderStatus = z.infer<typeof orderStatusSchema>;
