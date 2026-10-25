# EverBloom Expo Frontend: API Contract a New Node.js + Prisma Backend Must Implement

Scope note: every citation is a local source file in the frontend root `/Users/emre/Desktop/app-plant-api-app/apps/mobile/`. Link text gives `path:lines`. Method: static reading of all of `src/` (the `ios/`, `node_modules/` and `platform-master` trees were skipped). The only command run was the project's own local `node_modules/.bin/tsc --noEmit`, a read-only type check, to confirm the TypeScript error. The demo server was not contacted. The static bearer token value has been left out on purpose.

## Q1. What is the full list of endpoints in src/config/index.tsx, and for each one, where is it called (RTK Query or axios) and with exactly what payload?

### Takeaway
`src/config/index.tsx` defines 23 endpoint URLs, all under `${BASE_URL}api/...`. RTK Query (`apiSlice`) calls 11 of them as GET queries. Screens call the other 12 directly with axios: 10 POST, 1 PUT and 1 DELETE. No endpoint carries a per-user credential. Every request sends the same static `Authorization: Bearer <static token>`, and the user is identified only by a `user.id` in the URL path or an `email`/`userId` in the body.

### Cited Findings

**Base URL and shared headers**
- `BASE_URL = DOMAIN = 'https://everbloom.rn-admin.site/'`. A commented-out `http://127.0.0.1:8000/` and a LAN IP `http://10.155.0.53:8000/` are also defined as `LOCALHOST`, but that constant is not used — [src/config/index.tsx:1-5][cfg]
- Every URL constant is `${BASE_URL}api/<path>` — [src/config/index.tsx:8-38][cfg]. All 23 are re-exported in `ENDPOINTS` — [src/config/index.tsx:50-75][cfg]
- axios calls send `CONFIG.headers = {'Content-Type': 'application/json', Authorization: 'Bearer ' + AUTHORIZATION_TOKEN}`. The token is a hardcoded constant in the bundle — [src/config/index.tsx:40-48][cfg]
- RTK Query uses `fetchBaseQuery({baseUrl: BASE_URL, prepareHeaders: headers.set('authorization', 'Bearer ' + AUTHORIZATION_TOKEN)})` — [src/store/slices/apiSlice.tsx:17-25][api]
- RTK Query defines no `tagTypes`, `providesTags` or `invalidatesTags`, and no mutations. All 11 endpoints are `builder.query` — [src/store/slices/apiSlice.tsx:17-110][api]

**RTK Query GET endpoints (apiSlice)**

| # | Constant → Method & path | RTK endpoint | Arg | Called from |
|---|---|---|---|---|
| 1 | `GET_USER` → `GET /api/user/{userId}` | `getUser` [apiSlice:28-44][api] | `user?.id \|\| 0` | [TabNavigator.tsx:27-32][tabs] (refetched on every tab change [:34-37][tabs]), [Search.tsx:27-31][search], [Filter.tsx:47-51][filterScr], [OrderHistory.tsx:19-23][history] |
| 2 | `GET_ORDERS` → `GET /api/order/{userId}` | `getOrders` [apiSlice:46-48][api] | `user?.id \|\| 0` | [OrderHistory.tsx:25-34][history] (refetch on mount), [Product.tsx:65-69][product] |
| 3 | `GET_REVIEWS` → `GET /api/reviews/{productId}` | `getReviews` [apiSlice:50-52][api] | `item?.id \|\| 0` | [Product.tsx:58-63][product] (refetch on screen focus [:75-81][product]) |
| 4 | `GET_CAROUSEL` → `GET /api/slides` | `getCarousel` [apiSlice:54-59][api] | none | [Home.tsx:53-58][home] |
| 5 | `GET_PROMOCODES` → `GET /api/promocodes` | `getPromocodes` [apiSlice:61-66][api] | none | [Order.tsx:36-41][order] |
| 6 | `GET_COLORS` → `GET /api/colors` | `getColors` [apiSlice:68-73][api] | none | [Product.tsx:52-56][product], [Filter.tsx:65-69][filterScr] |
| 7 | `GET_PLANTS` → `GET /api/plants` | `getPlants` [apiSlice:75-80][api] | none | [Home.tsx:32-37][home], [Categories.tsx:22-27][categories], [Order.tsx:29-34][order], [Wishlist.tsx:18-23][wishlist], [Search.tsx:33-37][search], [Header.tsx:45-49][header] |
| 8 | `GET_POT_TYPES` → `GET /api/pot/types` | `getPotTypes` [apiSlice:82-87][api] | none | [Filter.tsx:53-57][filterScr] |
| 9 | `GET_PLANT_TYPES` → `GET /api/plant/types` | `getPlantTypes` [apiSlice:89-94][api] | none | [Filter.tsx:59-63][filterScr] |
| 10 | `GET_BANNERS` → `GET /api/banners` | `getBanners` [apiSlice:96-101][api] | none | [Home.tsx:39-44][home] |
| 11 | `GET_CATEGORIES` → `GET /api/categories` | `getCategories` [apiSlice:103-108][api] | none | [Home.tsx:46-51][home], [Categories.tsx:29-34][categories] |

**axios endpoints (screens). Exact request bodies:**

| # | Constant → Method & path | Screen / function | Exact body (JSON) | Client reaction |
|---|---|---|---|---|
| 12 | `LOGIN_USER` → `POST /api/user/login` | `SignIn.handleSignIn` [SignIn.tsx:46-73][signin] | `{email, password}` [SignIn.tsx:37][signin], [:50-55][signin] | 200 → `setUser(response.data.user)` [:57-59][signin]. 401 → "Invalid username or password" [:64-67][signin]. Anything else → generic alert |
| 12b | same | `SignUpAccountCreated.handleSignIn` [SignUpAccountCreated.tsx:24-51][created] | `{email, password}` taken from navigation params [:19][created], [:28-33][created] | 200 → `setRememberMe(true)` + `setUser(response.data.user)` [:35-38][created]. Any error → reset to SignIn + generic alert [:42-47][created] |
| 13 | `CREATE_USER` → `POST /api/user/create` | `SignUp.handleCreateUser` [SignUp.tsx:50-76][signup] | `{name, email, password}` (confirmPassword is checked on the client only) [:53-58][signup], [:151][signup] | 200 → `navigation.replace('SignUpAccountCreated', {email, password})`; the response body is ignored [:60-62][signup]. 409 → "User with this name or email already exists" [:67-69][signup] |
| 14 | `ORDER_CREATE` → `POST /api/order/create` | `Checkout.handleConfirmOrder` [Checkout.tsx:29-71][checkout] | `{name, total, address, discount, delivery, subtotal, cardHolderName, products: cart, userId: user?.id, email: user?.email, phoneNumber: user?.phoneNumber}` [:32-44][checkout] | 200 → reset to `OrderSuccessful`; body ignored [:52-57][checkout]. Non-200 or error → reset to `OrderFailed` [:59-67][checkout] |
| 15 | `DELETE_ACCOUNT` → `DELETE /api/user/delete/{userId}` | `DeleteAccount.handleDeleteAccount` [DeleteAccount.tsx:23-46][del] | no body [:27-31][del] | 200 → `logOut()` + "Account deleted successfully" [:33-36][del]. Error → goBack + generic [:40-42][del] |
| 16 | `CREATE_REVIEW` → `POST /api/review/create` | `LeaveAReview.createReview` [LeaveAReview.tsx:40-61][review] | `{comment, rating, name: user?.name, plantId: productId, email: user?.email}` [:28-34][review] | 200 → goBack [:50-53][review]. Otherwise "Failed to create review" [:54-57][review] |
| 17 | `GET_PROMOCODE` → `POST /api/promocode/show` (POST despite the "GET_" name) | `MyPromocodes.handleAddPromocode` [MyPromocodes.tsx:43-74][mypromo] | `{voucher}` [:47-52][mypromo] | 200 → `addPromocode({...response.data.promocode, userId: user?.id})` [:54-60][mypromo]. 404 → "Promocode not found" [:66-67][mypromo] |
| 18 | `CHANGE_PASSWORD` → `POST /api/change/password` | `NewPassword.handleChangePassword` [NewPassword.tsx:43-64][newpw] | `{email, password}` (email comes from route params) [:18][newpw], [:46-51][newpw] | 200 → `ForgotPasswordSentEmail` [:53-55][newpw]. Else generic |
| 19 | `UPDATE_USER` → `PUT /api/user/update/{userId}` | `EditProfile.handleUpdate` [EditProfile.tsx:55-78][edit] | `{name, location}`. Email and phone are shown but **not sent** [:39][edit], [:59-64][edit] | 200 → `setUser(response.data.user)` + navigate `InfoSaved` [:66-69][edit] |
| 20 | `SEND_EMAIL_OTP` → `POST /api/send/otp/email` | `SendEmailOtp.handleSendOtp` (logged in) [SendEmailOtp.tsx:25-45][sEmail] | `{email: user.email}` [:18-21][sEmail], [:28-33][sEmail] | 200 → `replace('VerifyEmail', {email})` [:35-37][sEmail] |
| 20b | same | `SendEmailOtpForgot.handleSendOtp` (logged out) [SendEmailOtpForgot.tsx:33-54][sEmailF] | `{email}` (typed by user) [:36-41][sEmailF] | 200 → `replace('VerifyEmailForgot', {email})` [:43-45][sEmailF] |
| 20c | same (resend) | `VerifyEmail.handleResendOtp` [VerifyEmail.tsx:123-144][vEmail] and `VerifyEmailForgot.handleResendOtp` [VerifyEmailForgot.tsx:120-141][vEmailF] | `{email, otp}`. The verify payload object is reused, so a partially typed otp is sent [VerifyEmail.tsx:46][vEmail], [:126-131][vEmail] | 200 → "OTP sent successfully" |
| 21 | `SEND_PHONE_OTP` → `POST /api/send/otp/phone` | `SendPhoneOtp.handleSendOtp` [SendPhoneOtp.tsx:41-63][sPhone] | `{email: user?.email, phoneNumber}` [:36-39][sPhone], [:45-50][sPhone] | Status check is the assignment `(response.status = 200)`, which is always truthy → `replace('VerifyPhone', {email, phoneNumber})` [:52-53][sPhone] |
| 21b | same (resend) | `VerifyPhone.handleResendOtp` [VerifyPhone.tsx:100-121][vPhone] | `{email, phoneNumber}` [:103-108][vPhone] | 200 → "OTP sent successfully" |
| 22 | `VERIFY_PHONE_OTP` → `POST /api/verify/otp/phone` | `VerifyPhone.handleVerify` [VerifyPhone.tsx:70-98][vPhone] | `{email, phoneNumber, otp}` [:73-78][vPhone] | 200 → `setUser(response.data.user)` → `PhoneVerified` [:80-83][vPhone]. 401 → "Invalid OTP" [:90-92][vPhone] |
| 23 | `VERIFY_EMAIL_OTP` → `POST /api/verify/otp/email` | `VerifyEmail.handleVerify` [VerifyEmail.tsx:73-121][vEmail] | `{email, otp}` [:44-46][vEmail], [:76-81][vEmail] | 200 → `setUser(response.data.user)` → `EmailVerified` [:83-87][vEmail]. 422/404/401 → `Alert('Error', err.response.data.message)` [:94-115][vEmail] |
| 23b | same | `VerifyEmailForgot.handleVerify` [VerifyEmailForgot.tsx:72-118][vEmailF] | `{email, otp}` [:45][vEmailF], [:75-80][vEmailF] | 200 → `replace('NewPassword', {email})`; no user is set [:82-84][vEmailF]. Same 422/404/401 handling [:91-112][vEmailF] |

- OTP verification submits automatically once all 5 digit inputs are filled (`otp.length === 5`) — [VerifyEmail.tsx:54-71][vEmail]; [VerifyPhone.tsx:51-68][vPhone]
- Client-side validation runs before each call: `validation(user)` on sign-in [SignIn.tsx:183][signin]; `{name,email,password,confirmPassword}` on sign-up [SignUp.tsx:151][signup]; `{name, location}` on profile update [EditProfile.tsx:143][edit]; `{password, confirmPassword}` on password reset [NewPassword.tsx:115][newpw]; `{comment, rating}` on reviews [LeaveAReview.tsx:113][review]; `{promoCode: voucher}` on vouchers [MyPromocodes.tsx:152][mypromo]; `{email}` [SendEmailOtpForgot.tsx:90][sEmailF]; `{phoneNumber}` [SendPhoneOtp.tsx:108][sPhone]

### Inferences
- The client checks success with strict `response.status === 200` everywhere (e.g. [SignUp.tsx:60][signup], [Checkout.tsx:52][checkout], [LeaveAReview.tsx:50][review]). A REST-idiomatic `201 Created` would therefore take the failure branch: sign-up would show "Something went wrong", checkout would go to `OrderFailed`, and reviews would show "Failed to create review". The new backend should return **200** on every create endpoint, or the frontend should be changed to accept any 2xx.
- Port 8000 in the `LOCALHOST` constant is the `php artisan serve` default. Together with the unrelated Orchid package in the workspace, this suggests the original backend was Laravel. It does not change the contract.

### Gaps
- Six endpoints have their response body ignored by the client: create user, create order, create review, delete, send OTP and change password. The original server's bodies for these cannot be recovered from the frontend.

## Q2. What response shape does each call expect (field names, nesting, arrays vs objects), including transformResponse logic?

### Takeaway
List endpoints (slides, promocodes, colors, plants, pot types, plant types, banners, categories) must return a **bare JSON array**. `transformResponse` wraps the array under a key, and any non-array (for example a Laravel-style `{data: [...]}`) is silently replaced by `[]`. Three endpoints have no transform and must return objects: `GET /api/user/{id}` returns a bare user object, `GET /api/order/{id}` returns `{orders: [...]}` and `GET /api/reviews/{id}` returns `{reviews: [...]}`. axios endpoints read `response.data.user` (login, profile update, both verifies) and `response.data.promocode`. Only the email-OTP verify screens read an error `message`.

### Cited Findings

**transformResponse logic (identical pattern for 8 endpoints)**
- `transformResponse: (response) => ({<key>: Array.isArray(response) ? response : []})` is used for `carousel` [apiSlice:54-59][api], `promocodes` [:61-66][api], `colors` [:68-73][api], `plants` [:75-80][api], `potTypes` [:82-87][api], `plantTypes` [:89-94][api], `banners` [:96-101][api] and `categories` [:103-108][api]
- `getCarousel` is typed `{carousel: string[]}` [apiSlice:54][api], but Home reads object fields `item.image`, `item.promotion`, `item.title_line_1`, `item.title_line_2` from each element — [Home.tsx:117-164][home]; [src/types/CarouselType.tsx:1-7][tCar]

**Endpoints without transform (the raw body is used as-is)**
- `GET /api/user/{id}`: in `onQueryStarted`, a falsy `data` dispatches `logOut()` and a truthy `data` dispatches `setUser(data)`, so the body must be the **bare user object**, not `{user}`. Any request error (non-2xx, network) also dispatches `logOut()` — [apiSlice:28-44][api]
- `GET /api/order/{userId}` must be `{orders: Order[]}`. OrderHistory feeds `ordersData?.orders || []` to the accordion [OrderHistory.tsx:162][history] and then dereferences `ordersData.orders.length` without optional chaining [:174-176][history]. Product uses `ordersData?.orders.find(order => order.products.find(product => product.id === item.id))` [Product.tsx:71-73][product]
- `GET /api/reviews/{productId}` must be `{reviews: Review[]}` — [Product.tsx:344-356][product]

**Per-element field expectations (what the UI actually reads)**
- **Plant** (each element of `GET /api/plants`): `id, name, price, oldPrice?, rating, image, images[], description, categories, colors[], color, potTypes[], plantTypes[], promotion, isBestSeller, isFeatured, isNew, isTop` — [src/types/ProductType.tsx:3-28][tProd]. Uses: `images.length`/map [Product.tsx:114][product], [:139-150][product], [:196][product]; `rating` [Product.tsx:219][product]; `price` [Product.tsx:247][product]; `colors` matched by name [Product.tsx:90-92][product]; flags [Home.tsx:71-75][home], [Shop.tsx:81-86][shop], [Header.tsx:51-58][header]; `promotion` [Home.tsx:118-120][home]; `categories.includes(category.name)` [Home.tsx:287-289][home], [Categories.tsx:70-72][categories]; `oldPrice` [ProductPrice.tsx:18-30][pPrice]
- `rating` must be a JSON **number**. `ProductRating` calls `rating.toFixed(1)` [src/product/ProductRating.tsx:49][pRating] and `ReviewItem` calls `item.rating.toFixed(1)` [src/items/ReviewItem.tsx:55][reviewItem]. A decimal string would throw at runtime.
- `price` is coerced with `Number(action.payload.price)` in the cart [cartSlice.tsx:35-37][cart], subtracted for sorting [Shop.tsx:95-98][shop] and displayed raw as `${item.price}` [Checkout.tsx:115][checkout]
- **Review**: `id, name, rating, comment, createdAt, email` — [src/types/ReviewType.tsx:1-8][tRev]. The UI renders `name`, `rating.toFixed(1)`, `createdAt` as a raw string and `comment` — [ReviewItem.tsx:44-75][reviewItem]. `id.toString()` is used as the key — [Product.tsx:364][product]; [Reviews.tsx:20][reviews]
- **Order** (`orders[]`): `id` shown as `#id`, `total`, `orderStatus` ∈ {`shipping`,`delivered`,`canceled`,`pending`,`processing`}, `createdAt` shown raw, `delivery`, `products[]` — [OrderHistory.tsx:61-146][history]
- **Order line** (`orders[].products[]`): `id` (React key, and compared to the **plant id** in Product.tsx), `name`, `quantity`, `price` — [OrderHistory.tsx:101-117][history]; [Product.tsx:71-73][product]
- **Promocode** (`GET /api/promocodes` elements and `response.data.promocode`): `id, code, userId, discount, expires_at` — [src/types/PromocodeType.tsx:1-7][tPromo]. Displays `{discount}%`, `Expire {expires_at}` (raw) and `code`; tapping copies `code` to the clipboard — [PromocodeItem.tsx:34-85][promoItem]. Order tab matching: `promocodes.find(item => item.code === promoCode)` then `Number(match.discount)` — [Order.tsx:48-50][order], [:155-157][order]
- **Color**: `id, name, code`. `code` is used as a CSS `backgroundColor` — [src/types/ColorType.tsx:1-5][tColor]; [Filter.tsx:276][filterScr]; [Product.tsx:274-288][product]
- **PotType / PlantType**: `id, name`. `id.toString()` is the key and `name` is the filter value — [src/types/PotType.tsx:1-4][tPot]; [src/types/PlantType.tsx:1-4][tPlantT]; [Filter.tsx:318-356][filterScr], [:378-416][filterScr]
- **Category**: `id, name, image?, quantity?`. `quantity` is never read; counts are computed on the client — [src/types/CategoryType.tsx:1-6][tCat]; [Home.tsx:287-298][home]. A missing `image` falls back to the literal string `'default_image_uri'` — [Categories.tsx:99][categories]; [CategoryItem.tsx:42][catItem]
- **Banner**: type has `id, title, title1, title2, image, btnText, promotion, description1, description2` [src/types/BannerType.tsx:1-11][tBanner], but only `banners[0].image` and `banners[0].promotion` are rendered/used — [Home.tsx:346-389][home]
- **Slide**: `id, image, promotion, title_line_1, title_line_2` (snake_case) — [CarouselType.tsx:1-7][tCar]
- **User** (bare object from `GET /api/user/{id}`; `response.data.user` from login/update/verify): `id, name, email, location, phoneNumber, phoneVerified, emailVerified` are read — [src/types/UserType.tsx:1-12][tUser]; [Profile.tsx:15-16][profile]; [EditProfile.tsx:27-32][edit]; [UserData.tsx:41-51][userData]; [Checkout.tsx:41-43][checkout]

**Error / empty handling on the client**
- Any RTK query error makes the screen render `<components.Error/>` ("Something went wrong") instead of content: Home [Home.tsx:433][home], Order tab [Order.tsx:43][order], [:292][order], Product [Product.tsx:85-86][product], [:405][product], Filter [Filter.tsx:92][filterScr], [:427][filterScr], OrderHistory [OrderHistory.tsx:169-172][history], Categories [Categories.tsx:44][categories], [:164][categories]
- An empty array renders `NoData` or an empty state: Home checks `isData` **before** `isLoading`, so "No data" flashes while loading [Home.tsx:89-94][home], [:433-435][home]. Shop shows `NoData` when the filtered list is empty [Shop.tsx:170][shop]. OrderHistory shows `NoData` when `orders.length === 0` [OrderHistory.tsx:174][history]
- axios error handlers dereference `error.response.status` without a null check, so a network error with no response throws inside the `catch` — [SignIn.tsx:64][signin]; [SignUp.tsx:67][signup]; [MyPromocodes.tsx:66][mypromo]
- Only the two email-verify screens read a server error message (`err.response.data.message`) — [VerifyEmail.tsx:99][vEmail]; [VerifyEmailForgot.tsx:96][vEmailF]. Elsewhere only the status code matters (401 login, 409 sign-up, 404 promocode, 401 phone OTP).

### Inferences
- Minimum compatible contract for the new backend:
  - `GET /api/plants|colors|categories|pot/types|plant/types|banners|slides|promocodes` → `200 [ ... ]` (bare array, never wrapped)
  - `GET /api/user/:id` → `200 {id,name,email,location,phoneNumber,phoneVerified,emailVerified}`. Never include the password hash: the object is persisted to AsyncStorage (see Q4).
  - `GET /api/order/:userId` → `200 {orders: [{id,total,delivery,orderStatus,createdAt,products:[{id:<plantId>,name,price,quantity,color?}]}]}`. Always include `orders`, even when empty.
  - `GET /api/reviews/:plantId` → `200 {reviews: [{id,name,rating:number,comment,createdAt,email}]}`
  - `POST /api/user/login` → `200 {user}` (plus `token` for JWT, see Q4), `401` on bad credentials
  - `POST /api/user/create` → `200`, `409` on duplicate name/email
  - `PUT /api/user/update/:id` → `200 {user}`
  - `POST /api/verify/otp/email|phone` → `200 {user}`, `401/404/422 {message}`
  - `POST /api/promocode/show` → `200 {promocode}`, `404`
  - Remaining POST/DELETE endpoints → `200` with any body
- The Product screen's "Leave a review" gate compares `order.products[].id` to the plant id, so the order-line serializer must expose the plant id as `id` (or the frontend must switch to `plantId`). A Prisma `OrderItem.id` must not be serialized as `id` here.
- Because `createdAt` and `expires_at` are printed verbatim, the backend should either pre-format them for display or the frontend should start formatting ISO dates.

### Gaps
- The original date format for `createdAt` / `expires_at` is not visible.
- `ProductType.categories` is typed `string` [ProductType.tsx:17][tProd] but used with `.includes(name)`. That works for both a string and a `string[]`, so the original wire format (array or comma-separated string) cannot be determined. A string would also cause substring false-matches.

## Q3. What entities exist, what fields and types do they have, and how do they relate (the future Prisma schema)?

### Takeaway
The frontend implies 11 persistent entities: User, Plant, Category, Color, PotType, PlantType, Banner, Slide, Review, Promocode and Order with OrderItem, plus an OTP store. Plants link to categories, colors, pot types and plant types **by name strings**, and to banners/slides through a free-text `promotion` string. The backend can normalize these relations in Prisma as long as the serializer flattens them back to name arrays.

### Cited Findings
- **User**: `id?: number, name?, email?, password?, confirmPassword?, location?, phoneNumber?, otp?, phoneVerified?: boolean, emailVerified?: boolean` — [UserType.tsx:1-12][tUser]. `confirmPassword` and `otp` are request-only fields, see sign-up [SignUp.tsx:57][signup] and verify [VerifyEmail.tsx:46][vEmail]. A separate `SendUserData {email,password,name,phoneNumber}` type exists but is unused — [src/types/SendUserData.tsx:1-6][tSend]
- **Plant/Product**: `id:number, name:string, price:number, rating:number, image:string, images:string[], isBestSeller:boolean, potTypes:string[], sizes:string[], size:string, colors:string[], color:string, description:string, categories:string, isBestseller:boolean, isFeatured:boolean, oldPrice?:number, quantity?:number, reviews:ReviewType[], types:string[], promotion:string, plantTypes:string[], isNew:boolean, isTop:boolean` — [ProductType.tsx:3-28][tProd]
  - `sizes`, `size`, `types`, `isBestseller` (lowercase s) and `reviews` are declared but never read in `src/`. Only `isBestSeller` is used [Home.tsx:72][home]; [Header.tsx:57][header], and reviews come from a separate endpoint [Product.tsx:58-63][product]
  - `color` is the client-selected color stored on the cart line [Product.tsx:88][product], [:94][product] and displayed in the cart [OrderItem.tsx:64-79][orderItem]. `quantity` is a cart-only field [cartSlice.tsx:39-42][cart]
- **Category** `{id, name, image?, quantity?}` [CategoryType.tsx:1-6][tCat]. **Color** `{id, name, code}` [ColorType.tsx:1-5][tColor]. **PotType** `{id, name}` [PotType.tsx:1-4][tPot]. **PlantType** `{id, name}` [PlantType.tsx:1-4][tPlantT]
- **Banner** `{id, title, title1, title2, image, btnText, promotion, description1, description2}` [BannerType.tsx:1-11][tBanner]. **Slide** `{id, image, promotion, title_line_1, title_line_2}` [CarouselType.tsx:1-7][tCar]
- **Review** `{id, name, rating, comment, createdAt, email}`, created with `plantId` [ReviewType.tsx:1-8][tRev]; [LeaveAReview.tsx:28-34][review]
- **Promocode** `{id, code, userId, discount, expires_at}` [PromocodeType.tsx:1-7][tPromo]. `discount` is a percentage (`total = subtotal * (1 - discount/100)`) [cartSlice.tsx:103-110][cart]
- **Order**: create payload fields are `name, total, address, discount, delivery, subtotal, cardHolderName, products, userId, email, phoneNumber` [Checkout.tsx:32-44][checkout]. Read fields are `id, total, delivery, orderStatus, createdAt, products[]` [OrderHistory.tsx:61-146][history]
- **Order status** enum values used by the UI: `pending`, `processing`, `shipping`, `delivered`, `canceled` — [OrderHistory.tsx:65-79][history]
- **OrderItem** read fields `id (plant id), name, quantity, price` [OrderHistory.tsx:101-117][history]. The posted `products` are full cart `ProductType` objects with `quantity` and the selected `color` [Checkout.tsx:40][checkout]; [cartSlice.tsx:39-42][cart]
- **Relations by name**: `product.potTypes.includes(potType.name)`, `product.plantTypes.includes(plantType.name)`, `product.colors.includes(color.name)` [Shop.tsx:52-71][shop]; colors resolved to hex by `color.name` [Product.tsx:90-92][product], [:274-277][product]; `product.categories.includes(category.name)` [Home.tsx:287-289][home]; `plant.promotion === slide.promotion` [Home.tsx:118-120][home] and `=== banners[0].promotion` [Home.tsx:349-353][home]
- **Template leftovers, not part of the plant domain**: `ChatType` [src/types/ChatType.tsx:1-12][tChat], `DiagnosticType` [src/types/DiagnosticType.tsx:1-7][tDiag] and `versionSlice {doctorList, dashboard}` [versionSlice.tsx:3-11][version] come from a medical-app template and are not used by any store screen.

### Inferences
- Suggested Prisma model set. This is a design proposal, not something found in the code:
  - `User { id Int @id @default(autoincrement()), name String, email String @unique, passwordHash String, location String?, phoneNumber String? @unique, emailVerified Boolean @default(false), phoneVerified Boolean @default(false), createdAt DateTime @default(now()), orders Order[], reviews Review[], otps OtpCode[], wishlist WishlistItem[], userPromocodes UserPromocode[] }`
  - `Plant { id, name, description, price Decimal, oldPrice Decimal?, rating Float @default(0) (or computed), image String, images PlantImage[], isBestSeller, isFeatured, isNew, isTop Boolean, promotionId Int?/promotion String?, stock Int (new), categories Category[], colors Color[], potTypes PotType[], plantTypes PlantType[], reviews Review[] }`. Use implicit M:N relations, serialized back to `string[]` of names.
  - `Category { id, name @unique, image? }`, `Color { id, name @unique, code }`, `PotType { id, name @unique }`, `PlantType { id, name @unique }`
  - `Promotion { id, key @unique }`, optional; it would tie `Slide`, `Banner` and `Plant` together instead of matching on a free-text string
  - `Slide { id, image, promotion, titleLine1 @map("title_line_1"), titleLine2 }`, `Banner { …all BannerType fields }`
  - `Review { id, rating Int, comment, userId → User, plantId → Plant, createdAt }`. The serializer derives `name` and `email` from the User.
  - `Promocode { id, code @unique, discountPercent Int, expiresAt DateTime, userId Int? (null = public), usageLimit?, active }`
  - `Order { id, userId, status OrderStatus @default(pending), recipientName, address, phoneNumber, email, subtotal Decimal, discountPercent, deliveryFee Decimal, total Decimal, promocodeId?, cardHolderName?, paymentStatus, paymentRef?, createdAt }`, `OrderItem { id, orderId, plantId, name (snapshot), unitPrice (snapshot), quantity, color? }`
  - `enum OrderStatus { pending processing shipping delivered canceled }`
  - `OtpCode { id, userId?, channel (email|phone), target, codeHash, purpose (verify_email|verify_phone|reset_password), expiresAt, consumedAt, attempts }`
- Serializer requirement: send money as JSON numbers (or keep `Number()` coercion in the client) and always send `rating` as a number (see Q2).

### Gaps
- The frontend says nothing about inventory/stock, product sizes (declared but unused), shipping methods, addresses as separate entities or admin roles. These are new design decisions, not implied requirements.

## Q4. How does authentication work today, and what must change for real per-user auth (e.g., JWT)?

### Takeaway
There is no real user authentication. One hardcoded bearer token, identical for every install, is sent on every request. Login returns only a `user` object, which is persisted in AsyncStorage through redux-persist. All user-scoped calls identify the user by `user.id` in the URL or `email`/`userId` in the body, so any client holding the shared token can read, modify or delete any user's data (IDOR). "Remember me" is effectively dead code, and logout is purely local.

### Cited Findings
- A static token constant is used in both axios `CONFIG.headers` and RTK `prepareHeaders` — [config/index.tsx:40-48][cfg]; [apiSlice.tsx:21-24][api]
- Login success reads only `response.data.user`; no token is consumed — [SignIn.tsx:57-59][signin]; [SignUpAccountCreated.tsx:35-38][created]
- Session state is `userSlice {user: UserType|null, rememberMe: boolean}`. `logOut` sets `user = null, rememberMe = false` — [userSlice.tsx:4-18][user]
- `userSlice` is in the redux-persist whitelist (AsyncStorage), so the user object survives app restarts — [store/index.tsx:42-56][store]
- Navigation gating relies only on the presence of `user` in Redux (plus `startSlice.start` for onboarding) — [StackNavigator.tsx:17-18][stack], [:23-31][stack], [:33-72][stack], [:74-198][stack]
- User-scoped requests put the id in the path (`/api/user/{id}`, `/api/order/{id}`, `/api/user/update/{id}`, `/api/user/delete/{id}`) — [apiSlice.tsx:29][api], [:47][api]; [EditProfile.tsx:61][edit]; [DeleteAccount.tsx:30][del]. Or in the body: `userId`/`email` in orders [Checkout.tsx:41-43][checkout], `email`/`name` in reviews [LeaveAReview.tsx:31-33][review], `email` in OTP calls [SendPhoneOtp.tsx:36-39][sPhone]
- Session validation happens implicitly: `getUser` runs on TabNavigator mount and **on every tab change**, and any error or falsy body dispatches `logOut()` — [TabNavigator.tsx:27-37][tabs]; [apiSlice.tsx:30-42][api]
- Remember me: SignIn toggles `setRememberMe(!rememberMe)` [SignIn.tsx:143-145][signin]. Sign-up auto-login sets it to `true` [SignUpAccountCreated.tsx:36][created]. The `AppState` component would `logOut()` when the app goes to background/inactive if `!rememberMe` [AppState.tsx:26-33][appstate], but it is only exported from `components/index.tsx` [components/index.tsx:7][compIdx], [:20][compIdx] and never rendered. `App.tsx` mounts only Provider/PersistGate/NavigationContainer/StackNavigator/FlashMessage [App.tsx:35-49][app]. Remember me has no effect, and sessions persist indefinitely.
- The persist whitelist names a non-existent `'rememberMeSlice'` — [store/index.tsx:54][store]
- Logout is local only (`dispatch(actions.logOut())`, no API call) — [LogOut.tsx:53-57][logout]. `logOut` does not clear `cartSlice`, `wishlistSlice`, `paymentSlice` or `promocodeSlice`, which are all persisted — [userSlice.tsx:15-18][user]; [store/index.tsx:45-55][store]
- The user object is printed to the console on Profile and TabNavigator render — [Profile.tsx:18][profile]; [TabNavigator.tsx:25][tabs]
- `expo-secure-store` (or any secure storage) is not a dependency — [package.json:12-40][pkg]

### Inferences
- Required backend changes:
  1. `POST /api/user/login` (and probably sign-up and the verify endpoints) returns `{user, token}` (optionally `refreshToken`). Passwords are hashed with bcrypt/argon2.
  2. Every user-scoped route requires a JWT and derives the user from it. Either add `/api/user/me`-style routes, or keep the `/{id}` paths for compatibility and reject when `:id !== jwt.sub`.
  3. Order, review and OTP bodies must stop trusting `userId`/`email` from the client.
  4. Return `401` on an expired or invalid token. The client already logs out on any `getUser` error, which suits that.
  5. Optionally add `POST /api/user/logout` and refresh endpoints. The static app token can be dropped, or kept only as a non-secret client identifier.
- Required frontend changes:
  1. Store the token at login: add a `token` field to `userSlice` (or a new `authSlice`), ideally in `expo-secure-store` rather than AsyncStorage.
  2. `prepareHeaders: (headers, {getState}) => headers.set('authorization', 'Bearer ' + getState().userSlice.token)`.
  3. Replace the static `CONFIG.headers` with an axios instance plus an interceptor that reads the token.
  4. Either mount `<components.AppState/>` or remove the remember-me UI.
  5. Clear the cart, wishlist, payment and promocode slices on logout.

### Gaps
- The original backend's real auth behavior is unknown: whether the static token was validated server-side, and whether the original API also accepted per-user tokens.

## Q5. What does the checkout/payment screen send — is raw card data sent to the backend? What does the order payload look like?

### Takeaway
Raw card data (number, expiry, CVV) is **collected and persisted on the device but never sent to the backend**. The order POST carries only `cardHolderName` plus totals, address and the full cart objects. No payment authorization happens anywhere, so today an "order" is created without any charge, and a real backend must add a payment provider flow. The client computes all money values (`subtotal`, `discount`, `delivery`, `total`), and the backend must recompute them rather than trust them.

### Cited Findings
- ShippingAndPaymentInfo collects `name`, `address` (free-text "delivery address"), `cardNumber` (auto-spaced to `#### #### #### ####`, maxLength 19), `expiryDate` (auto-slash `MM/YY`, maxLength 5), `cvv` (maxLength 3) and `cardHolderName`. Phone and email are shown read-only from the user — [ShippingAndPaymentInfo.tsx:18-19][ship], [:67-97][ship], [:116-192][ship]
- These values live in `paymentSlice {cvv, name, address, cardNumber, expiryDate, cardHolderName}` [paymentSlice.tsx:4-20][pay]. `paymentSlice` is in the redux-persist whitelist, so the **full PAN, expiry and CVV are written unencrypted to AsyncStorage** [store/index.tsx:45-55][store] (`'paymentSlice'` at line 51)
- CVV, card number and expiry are printed with `console.log` — [ShippingAndPaymentInfo.tsx:35][ship], [:40][ship], [:45][ship], [:50][ship]
- "Proceed to checkout" validates `{name, address, cardNumber, expiryDate, cvv, cardHolderName}` and only navigates; there is no network call — [ShippingAndPaymentInfo.tsx:198-221][ship]
- Checkout reads `{name, address, cardNumber, cardHolderName}` from `paymentSlice` but uses `cardNumber` only to display `'**** ' + last4` — [Checkout.tsx:25-27][checkout], [:145-146][checkout], [:178][checkout]
- **Exact order payload** POSTed to `/api/order/create` — [Checkout.tsx:32-50][checkout]:
  ```
  {
    name: string,              // paymentSlice.name (recipient full name)
    total: number,             // cartSlice.total (subtotal × (1 − discount/100); delivery NOT added)
    address: string,           // paymentSlice.address (free text)
    discount: number,          // percent, e.g. 10
    delivery: number,          // always 0 (never set anywhere)
    subtotal: number,          // Σ price × qty
    cardHolderName: string,
    products: ProductType[],   // full cart objects: id, name, price, quantity, color, image, images, description, flags, etc.
    userId: number | undefined,
    email: string | undefined,
    phoneNumber: string | undefined
  }
  ```
- `delivery` starts at 0 and is only ever reset to 0. No reducer or screen assigns another value — [cartSlice.tsx:7][cart], [:117][cart]. The commented-out total `(totalWithDiscount + delivery)` shows delivery was meant to be added — [Order.tsx:221][order]
- After a successful order, `OrderSuccessful` dispatches `resetCart()` on mount — [OrderSuccessful.tsx:16-18][success]. `paymentSlice` is never reset.
- Order creation is gated on the client by `user.emailVerified && user.phoneVerified` — [Order.tsx:272-278][order]
- Card validation rules: 16 digits after stripping spaces [validateCardNumber.tsx:14-15][vCard]; CVV `^\d{3,4}$` [validateCVV.tsx:14][vCvv], although the input caps at 3 [ShippingAndPaymentInfo.tsx:178][ship]; expiry is rejected only if past, and the MM/YY regex is commented out [validateExpiryDate.tsx:14-39][vExp]; holder name is ≥2 letters, Latin/Cyrillic only [validateCardHolderName.tsx:14][vHolder], [:24][vHolder]

### Inferences
- The backend must treat `total`, `subtotal`, `discount`, `delivery` and each `products[].price` as untrusted. It should load prices from the DB by `products[].id`, apply a server-validated promocode and a server-side delivery rule, check stock, and persist price snapshots in OrderItem.
- For the MVP backend, card data should never reach the Node server (PCI DSS scope). The frontend card fields should be replaced by a PSP's hosted/tokenized UI (for example Stripe PaymentSheet, or iyzico's checkout form for a Turkish market). The order endpoint would then receive a payment intent or token reference. `paymentSlice` card fields must be removed from persistence and the `console.log` calls deleted. This is a recommendation, not something found in the code.
- An order lifecycle is implied by the UI statuses (pending → processing → shipping → delivered / canceled), but there is no client action to cancel an order, so status changes must come from an admin side or payment webhooks.

### Gaps
- There is no evidence of how the original backend priced or validated orders, because the response body is ignored.

## Q6. What business logic is done only on the client today that a real backend must support or take over?

### Takeaway
Nearly all commerce logic is client-side and persisted per device, not per user. That covers cart math, promo application, delivery (always 0), catalog filtering, sorting and search, category counts, wishlist, the promocode wallet, the "verified purchase" review gate and the OTP-gated flows. Some of it is unsafe as built: all promocodes are public and validated on the device, and the password reset needs no proof of a verified OTP.

### Cited Findings
**Cart totals**
- The cart lives in `cartSlice {total, delivery, discount, subtotal, promoCode, list}` and is persisted — [cartSlice.tsx:5-12][cart]; [store/index.tsx:48][store]
- `addToCart` finds the line by `id` only, increments `quantity`, and does `subtotal += price` and `total += price*(1 - discount/100)` — [cartSlice.tsx:20-53][cart]. `removeFromCart` decrements or removes the line and clears `discount`/`promoCode` when the cart empties — [:54-77][cart]. `setDiscount` sets `total = subtotal*(1-d/100)` — [:103-110][cart]. `modifyItem` is defined but unused (it appears in no screen) — [cartSlice.tsx:78-102][cart]
- Because lines are keyed by plant id, the same plant cannot be in the cart in two colors. Product locks color selection once the item is in the cart, and "+ Add to cart" shows "Already Added" — [Product.tsx:290-298][product], [:377-385][product]; [src/alert/index.tsx:3-7][alert]
- The cart has no quantity cap: the +/- counters dispatch add/remove freely — [ProductCounter.tsx:23-24][pCounter], [:47-48][pCounter]

**Discounts / promo validation**
- The Order tab downloads **all** promocodes (`GET /api/promocodes`) and validates on the device: empty → "Promocode required", no exact `code` match → "Invalid promocode", then `setDiscount(Number(match.discount))` — [Order.tsx:36-50][order], [:105-159][order]. No expiry (`expires_at`) or ownership (`userId`) check is done. The "already applied" branch has no `return`, so the code is re-applied — [Order.tsx:139-157][order]. The voucher input is locked once `discount > 0` — [Order.tsx:95][order]
- If `GET /api/promocodes` fails, the entire cart tab renders the Error component — [Order.tsx:43][order], [:292][order]
- "My promocodes" is a separate local wallet: `POST /api/promocode/show {voucher}` returns a promocode, which the client stores in `promocodeSlice` with a client-assigned `userId` and filters by `item.userId === user.id` — [MyPromocodes.tsx:32-36][mypromo], [:54-60][mypromo]; [promocodeSlice.tsx:16-24][promo]. The wallet is not connected to the cart discount. Codes are validated as ≥3 chars on the client — [validatePromoCode.tsx:14][vPromo]

**Shipping cost**
- `delivery` is always 0 and the total excludes delivery — [cartSlice.tsx:7][cart], [:117][cart]; [Order.tsx:199-201][order], [:218-221][order]

**Stock**
- There is no stock or inventory field in `ProductType` [ProductType.tsx:3-28][tProd] and no out-of-stock UI anywhere.

**Wishlist**
- The wishlist is purely local: `wishlistSlice` stores full product snapshots, dedupes by id and is persisted. Removal asks for confirmation — [wishlistSlice.tsx:16-31][wish]; [ProductInWishlist.tsx:33-59][pWish]; [store/index.tsx:52][store]. The Wishlist tab renders the snapshots, not fresh catalog data — [Wishlist.tsx:16][wishlist], [:32-36][wishlist]

**Catalog filtering / sorting / search**
- The full catalog is fetched once and filtered in memory by pot type, plant type, color (by name), `Math.floor(rating)` ∈ selected ratings and status tags (`new`→`isNew`, `top`→`isTop`, `sale`→`oldPrice`) — [Shop.tsx:52-91][shop]
- Sort options are Top / Price low→high / Price high→low / Newest (`isNew` first) / Sale (`oldPrice` first) — [Shop.tsx:16-22][shop], [:93-110][shop]
- Search is a case-insensitive `name.includes(query)` — [Search.tsx:159-161][search]
- Category counts are computed on the client [Home.tsx:287-290][home]; [Categories.tsx:70-73][categories]. Burger-menu counts for sale/new/best/featured are client-side too [Header.tsx:51-58][header]
- There is no pagination and no `GET /plants/{id}`. Product detail renders the plant object passed through navigation params — [Product.tsx:28][product]; [Shop.tsx:25][shop]; [Reviews.tsx:10][reviews]

**Reviews / ratings**
- "Leave a review" appears only if one of the user's orders contains the plant id — [Product.tsx:71-73][product], [:390-399][product]
- Validation is rating 1-5 [validateRating.tsx:4][vRating] and comment 5-250 chars matching `^[a-zA-Zа-яА-Я\s!,.]*$` (no digits). The error text says "at most 100" — [validateComment.tsx:14-43][vComment]
- The plant `rating` is displayed straight from the plant object [Product.tsx:219][product]. Reviews are reversed on the client to show the newest first, and only 2 are previewed — [Product.tsx:346-347][product]
- Reviews expose the reviewer's `email` in the public list type — [ReviewType.tsx:7][tRev]

**OTP verification flows**
- OTP is 5 digits (`^\d{5}$`) — [validateOTPCode.tsx:14][vOtp]; [VerifyEmail.tsx:44][vEmail]
- **Email verify** (logged in): Profile → `SendEmailOtp` (`{email}`) → `VerifyEmail` (`{email, otp}`) → `setUser(user)` with `emailVerified: true` → `EmailVerified` — [Profile.tsx:148-152][profile]; [SendEmailOtp.tsx:25-37][sEmail]; [VerifyEmail.tsx:73-87][vEmail]
- **Phone verify** (logged in): Profile → `SendPhoneOtp` (`{email, phoneNumber}`, phone must match `^\+\d{10,}$`) → `VerifyPhone` (`{email, phoneNumber, otp}`) → `setUser(user)` with `phoneVerified: true` and the phone saved → `PhoneVerified` — [Profile.tsx:137-141][profile]; [validatePhoneNumber.tsx:19][vPhoneNum]; [SendPhoneOtp.tsx:36-53][sPhone]; [VerifyPhone.tsx:70-83][vPhone]. This is the only way `phoneNumber` reaches the server, because EditProfile does not send it [EditProfile.tsx:39][edit]
- **Forgot password** (logged out): SignIn → `SendEmailOtpForgot` (`{email}`) → `VerifyEmailForgot` (`{email, otp}` → 200) → `NewPassword` → `POST /api/change/password {email, password}`, with **no OTP or reset token included** — [SignIn.tsx:166-168][signin]; [SendEmailOtpForgot.tsx:33-45][sEmailF]; [VerifyEmailForgot.tsx:72-84][vEmailF]; [NewPassword.tsx:43-55][newpw]
- The same `SEND_EMAIL_OTP` and `VERIFY_EMAIL_OTP` endpoints serve both email verification and password reset. Nothing in the payload says which purpose applies — [SendEmailOtp.tsx:28-33][sEmail]; [SendEmailOtpForgot.tsx:36-41][sEmailF]

**Verification gates**
- Checkout requires both verifications [Order.tsx:272-278][order]. So do "My orders" [Profile.tsx:95-112][profile] and editing the profile via the user card [Profile.tsx:56-73][profile]. The "Personal info" menu item navigates to EditProfile without the check [Profile.tsx:83-87][profile]

**Account deletion**
- Deletion is `DELETE /api/user/delete/{id}` with no body and no password re-entry, after a client confirmation screen — [DeleteAccount.tsx:23-46][del], [:72-76][del]

**Profile edit**
- The email field is editable only if empty and phone only if empty, but only `{name, location}` is sent — [EditProfile.tsx:39][edit], [:111][edit], [:120][edit]

**Other client validation rules the backend should mirror**
- Email `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` [validateEmail.tsx:16][vEmailV]; password ≥6 [validatePassword.tsx:14][vPass]; confirm match [validateConfirmPassword.tsx:27][vConfirm]; name ≥2 letters `^[a-zA-Zа-яА-Я\s]*$` [validateName.tsx:17][vName], [:30][vName]; address/location non-empty [validateAddress.tsx:4][vAddr]; [validateLocation.tsx:4][vLoc]

### Inferences
Backend responsibilities to add:
1. Server-side cart pricing at order time (optionally a server cart for cross-device sync).
2. A promo validation endpoint, e.g. `POST /api/promocode/validate {code}` → `{code, discount}` or 404/410, that checks expiry, ownership and usage limits. Stop exposing `GET /api/promocodes` publicly, or limit it to the current user's codes.
3. Delivery fee rules.
4. Stock decrement inside a transaction on order creation.
5. A server wishlist (`GET/POST/DELETE /api/wishlist`), optional for the MVP.
6. Aggregate `Plant.rating` from reviews and enforce a verified purchase with one review per user per plant.
7. Derive the reviewer's name from the JWT and omit email from public reviews.
8. OTP storage with expiry, attempt limits and resend throttling, plus a `purpose` field.
9. A reset token returned by the forgot-password verify and required by `/api/change/password`. Without it, anyone can reset any account by email.
10. Cascade or anonymize orders and reviews on account deletion.
11. Server-side enforcement of `emailVerified && phoneVerified` for order creation.
12. Server-side filter/sort/search plus pagination once the catalog grows. The current contract (one full array) is fine for an MVP-sized catalog.

The name, card-holder and comment regexes allow only Latin and Cyrillic letters [validateName.tsx:30][vName]; [validateCardHolderName.tsx:24][vHolder]; [validateComment.tsx:34][vComment]. They reject Turkish letters (ç, ğ, ı, İ, ö, ş, ü), so for a Turkish market both frontend and backend validation must allow them.

### Gaps
- No business rules for delivery pricing, promo stacking, usage limits or OTP expiry/resend windows exist in the frontend. They must be specified fresh.

## Q7. Which screens/flows have no backend call at all yet (pure UI) but will need one?

### Takeaway
Wishlist, cart, the promocode wallet, payment/shipping info, catalog filtering/search, logout, remember-me, Support and Onboarding are entirely local or static. Product detail, Reviews and Shop render data passed through navigation params instead of fetching by id. The flows most likely to need new endpoints are wishlist sync, server cart/pricing, promo validation, payment, product-by-id, logout/token revoke and order status updates.

### Cited Findings
- **Wishlist tab and heart toggles**: local `wishlistSlice` only — [Wishlist.tsx:16][wishlist]; [ProductInWishlist.tsx:54-59][pWish]
- **Cart (Order tab)**: local `cartSlice`. Its only network calls are `getPlants` (for the "Shop now" button) and `getPromocodes` — [Order.tsx:21-41][order], [:263-270][order]
- **Shipping & Payment info**: local `paymentSlice`; no call — [ShippingAndPaymentInfo.tsx:198-221][ship]
- **Promocode wallet**: persisted locally. Only the lookup `POST /api/promocode/show` hits the server, and nothing saves the code to the user — [MyPromocodes.tsx:32-60][mypromo]; `removePromocode` exists but is never dispatched — [promocodeSlice.tsx:26-32][promo]
- **Filter / Shop sort / Search**: client-side over the cached plants array — [Filter.tsx:108-145][filterScr]; [Shop.tsx:52-110][shop]; [Search.tsx:159-161][search]
- **Product detail**: no `GET /api/plants/{id}`. It uses `route.params.item` and fetches only colors, reviews and orders — [Product.tsx:28][product], [:52-69][product]. **Reviews screen** uses `route.params.reviews` — [Reviews.tsx:10][reviews]. **Shop** uses `route.params.products` — [Shop.tsx:25][shop]. **Description** uses route params — [RootStackParamList.tsx:36][tRoute]
- **Logout**: local only — [LogOut.tsx:53-57][logout]. **Remember me**: local, and the `AppState` enforcer is not mounted — [AppState.tsx:26-33][appstate]; [App.tsx:35-49][app]
- **Support**: a hardcoded Alert with `support@everbloom.com` — [Header.tsx:261-272][header]
- **Onboarding**: three static slides with bundled images; `setStart(false)` on finish — [Onboarding.tsx:21-40][onboard], [:62][onboard]
- **Static result screens** with no calls: `OrderSuccessful` (only `resetCart`) [OrderSuccessful.tsx:16-18][success], `OrderFailed`, `InfoSaved`, `ForgotPasswordSentEmail`, `EmailVerified`, `PhoneVerified`, `SignUpAccountCreated` (auto-login only) — [StackNavigator.tsx:33-198][stack]
- **Order history**: read-only. There is no cancel, re-order or order-detail endpoint usage — [OrderHistory.tsx:154-166][history]
- **Product size**: `sizes`/`size` are declared but no UI or endpoint uses them — [ProductType.tsx:12-13][tProd]

### Inferences
- MVP endpoints to add beyond the existing 23:
  - `GET /api/plants/:id` (deep links, fresh price/stock)
  - `POST /api/promocode/validate` (or make `/promocode/show` do the full validation)
  - Payment intent / webhook endpoints
  - `GET/POST/DELETE /api/wishlist` (optional)
  - `POST /api/user/logout` or a refresh-token revoke (if refresh tokens are used)
  - Admin CRUD for catalog, banners, slides and promocodes, and order status updates (likely via an admin panel)
- Server-side catalog filtering is optional at MVP scale, because the client already filters the full array.

### Gaps
- It is not known whether the product owner wants the wishlist or cart to sync across devices. The current UX works without it.

## Q8. What frontend changes will be required to connect to a new backend (BASE_URL, token handling, hardcoded values, the TypeScript error at src/screens/tabs/Home.tsx:117)?

### Takeaway
At minimum: point `BASE_URL` at the new server, replace the static token with a stored per-user JWT in both axios and RTK Query, and fix the single TypeScript error. That error, confirmed by running `tsc`, is an implicitly-`any` destructured `item` in `Home.renderCarouselItem`. Beyond that, the client needs changes for status-code strictness, payment-data handling, validation regexes and a few logic bugs, or else the backend has to mimic their quirks.

### Cited Findings
- **BASE_URL**: change `DOMAIN` / `BASE_URL` (the dead `everbloom.rn-admin.site`) — [config/index.tsx:1-5][cfg]. All paths keep the `api/` prefix — [config/index.tsx:8-38][cfg]. The commented `127.0.0.1` and LAN IP `10.155.0.53:8000` are dev hosts — [config/index.tsx:1-2][cfg]
- **Token**: remove the static `AUTHORIZATION_TOKEN` / `CONFIG` [config/index.tsx:40-48][cfg] and rewrite RTK `prepareHeaders` [apiSlice.tsx:21-24][api]. Thirteen axios call sites pass `headers: CONFIG.headers` and need an axios instance or interceptor: SignIn, SignUp, SignUpAccountCreated, EditProfile, DeleteAccount, NewPassword, LeaveAReview, MyPromocodes, Checkout, SendEmailOtp, SendEmailOtpForgot, SendPhoneOtp, VerifyEmail, VerifyEmailForgot, VerifyPhone — [SignIn.tsx:53][signin]; [Checkout.tsx:48][checkout]; [VerifyEmail.tsx:79][vEmail] (others per the Q1 table)
- **Token capture points**: `setUser(response.data.user)` at [SignIn.tsx:58][signin], [SignUpAccountCreated.tsx:37][created], [VerifyEmail.tsx:85][vEmail], [VerifyPhone.tsx:81][vPhone], [EditProfile.tsx:67][edit]
- **TypeScript error (verified)**: running the project's local `node_modules/.bin/tsc --noEmit` with `strict: true` [tsconfig.json:4][tsconfig] reports exactly one error: `src/screens/tabs/Home.tsx(117,32): error TS7031: Binding element 'item' implicitly has an 'any' type.` The line is `const renderCarouselItem = ({item}) => {` — [Home.tsx:117][home]. The fix is `({item}: {item: CarouselType})`, with the `getCarousel` result type changed from `{carousel: string[]}` to `{carousel: CarouselType[]}` — [apiSlice.tsx:54-56][api]; [CarouselType.tsx:1-7][tCar]. The project has a `ts:check` script (`tsc`) — [package.json:10][pkg]
- **Loose typing to tighten**: `getOrders: builder.query<any, number>` and `getReviews: builder.query<any, any | any>` — [apiSlice.tsx:46][api], [:50][api]
- **Status strictness**: `=== 200` checks (see Q1 inference) — e.g. [SignUp.tsx:60][signup]; [Checkout.tsx:52][checkout]; [LeaveAReview.tsx:50][review]
- **Bugs to fix while connecting**: `if ((response.status = 200))` [SendPhoneOtp.tsx:52][sPhone]; unguarded `error.response.status` [SignIn.tsx:64][signin], [SignUp.tsx:67][signup], [MyPromocodes.tsx:66][mypromo]; missing `return` after "already applied" [Order.tsx:139-153][order]; the resend email OTP sends a stale `otp` [VerifyEmail.tsx:128][vEmail]; Home shows NoData before Loading [Home.tsx:433-435][home]; Filter's `isLoading` ignores `colorsLoading` [Filter.tsx:91][filterScr]; Shop has a `'Featured'` sort case that is not in the options [Shop.tsx:105-106][shop], [:16-22][shop]
- **Sensitive data**: remove `paymentSlice` from the persist whitelist and the CVV/PAN `console.log` calls — [store/index.tsx:51][store]; [ShippingAndPaymentInfo.tsx:35-50][ship]. Remove user `console.log`s — [Profile.tsx:18][profile]; [TabNavigator.tsx:25][tabs]; [VerifyEmail.tsx:84][vEmail]. Stop passing the plaintext password through navigation params after sign-up — [SignUp.tsx:61][signup]; [SignUpAccountCreated.tsx:19][created]
- **Hardcoded values**:
  - `$` currency in totals, cart line prices and the basket badge — [Checkout.tsx:100][checkout], [:115][checkout], [:137][checkout]; [Order.tsx:189][order], [:200][order], [:220][order]; [Header.tsx:388][header]; [ProductPrice.tsx:30][pPrice], [:42][pPrice]; [OrderHistory.tsx:62][history], [:114][history]
  - Support email [Header.tsx:266][header]
  - `'default_image_uri'` placeholder [Categories.tsx:99][categories]; [CategoryItem.tsx:42][catItem]
  - Static rating chips `'1,0'…'5,0'` [Filter.tsx:14-40][filterScr]
  - Status tags `['sale','top','new']` [Filter.tsx:108][filterScr]
  - Order status strings [OrderHistory.tsx:65-79][history]
- **Persist config**: drop the bogus `'rememberMeSlice'` [store/index.tsx:54][store]. Clear user-scoped slices on logout [userSlice.tsx:15-18][user]
- **Validation**: extend the name, card-holder and comment regexes to Turkish letters (and digits for comments) — [validateName.tsx:30][vName]; [validateCardHolderName.tsx:24][vHolder]; [validateComment.tsx:34][vComment]. Fix the "at most 100" message vs the 250 limit — [validateComment.tsx:24-27][vComment]

### Inferences
- The fastest path to a working app is a Node/Prisma backend that mirrors the existing paths and shapes exactly: bare arrays, `{orders}`, `{reviews}`, `{user}`, `{promocode}`, `{message}` on errors, status 200 on creates, and plant id in `orders[].products[].id`. In that case the only mandatory frontend edits are BASE_URL, token plumbing and the TS fix.
- On an Android emulator, a local dev backend is reached at `http://10.0.2.2:<port>/`, and plain HTTP needs cleartext allowed. Use HTTPS (or a tunnel) for device testing. This is general Expo/Android knowledge, not something in the repo.
- Because `getUser` logs the user out on any error and runs on every tab switch [TabNavigator.tsx:34-37][tabs], a backend that returns 401 on JWT expiry gives automatic logout for free. The flip side is that transient 5xx or network errors also log the user out, which may need softening, e.g. logging out only on 401/404.

### Gaps
- Whether the team wants to keep the legacy `/{id}` path style for compatibility or move to `/me` routes is a product and engineering decision the code cannot answer.

[cfg]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/config/index.tsx
[store]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/index.tsx
[api]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/apiSlice.tsx
[cart]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/cartSlice.tsx
[user]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/userSlice.tsx
[pay]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/paymentSlice.tsx
[promo]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/promocodeSlice.tsx
[wish]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/wishlistSlice.tsx
[version]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/store/slices/versionSlice.tsx
[tUser]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/UserType.tsx
[tProd]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/ProductType.tsx
[tCat]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/CategoryType.tsx
[tColor]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/ColorType.tsx
[tPot]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/PotType.tsx
[tPlantT]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/PlantType.tsx
[tBanner]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/BannerType.tsx
[tCar]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/CarouselType.tsx
[tRev]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/ReviewType.tsx
[tPromo]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/PromocodeType.tsx
[tSend]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/SendUserData.tsx
[tChat]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/ChatType.tsx
[tDiag]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/DiagnosticType.tsx
[tRoute]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/types/RootStackParamList.tsx
[signin]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/SignIn.tsx
[signup]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/SignUp.tsx
[created]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/SignUpAccountCreated.tsx
[edit]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/EditProfile.tsx
[del]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/DeleteAccount.tsx
[newpw]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/NewPassword.tsx
[logout]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/LogOut.tsx
[checkout]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Checkout.tsx
[ship]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/ShippingAndPaymentInfo.tsx
[mypromo]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/MyPromocodes.tsx
[review]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/LeaveAReview.tsx
[order]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/tabs/Order.tsx
[history]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/OrderHistory.tsx
[product]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Product.tsx
[home]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/tabs/Home.tsx
[profile]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/tabs/Profile.tsx
[reviews]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Reviews.tsx
[success]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/OrderSuccessful.tsx
[categories]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/tabs/Categories.tsx
[wishlist]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/tabs/Wishlist.tsx
[shop]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Shop.tsx
[search]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Search.tsx
[filterScr]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Filter.tsx
[onboard]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/Onboarding.tsx
[sEmail]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/verification/SendEmailOtp.tsx
[sEmailF]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/verification/SendEmailOtpForgot.tsx
[sPhone]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/verification/SendPhoneOtp.tsx
[vEmail]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/verification/VerifyEmail.tsx
[vEmailF]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/verification/VerifyEmailForgot.tsx
[vPhone]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/screens/verification/VerifyPhone.tsx
[stack]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/navigation/StackNavigator.tsx
[tabs]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/navigation/TabNavigator.tsx
[header]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/components/Header.tsx
[userData]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/components/UserData.tsx
[appstate]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/components/AppState.tsx
[compIdx]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/components/index.tsx
[alert]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/alert/index.tsx
[reviewItem]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/items/ReviewItem.tsx
[promoItem]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/items/PromocodeItem.tsx
[orderItem]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/items/OrderItem.tsx
[catItem]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/items/CategoryItem.tsx
[pRating]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/product/ProductRating.tsx
[pPrice]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/product/ProductPrice.tsx
[pCounter]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/product/ProductCounter.tsx
[pWish]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/product/ProductInWishlist.tsx
[vEmailV]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateEmail.tsx
[vPass]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validatePassword.tsx
[vConfirm]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateConfirmPassword.tsx
[vName]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateName.tsx
[vPhoneNum]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validatePhoneNumber.tsx
[vOtp]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateOTPCode.tsx
[vCard]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateCardNumber.tsx
[vCvv]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateCVV.tsx
[vExp]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateExpiryDate.tsx
[vHolder]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateCardHolderName.tsx
[vComment]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateComment.tsx
[vRating]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateRating.tsx
[vPromo]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validatePromoCode.tsx
[vAddr]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateAddress.tsx
[vLoc]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/src/validation/validateLocation.tsx
[app]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/App.tsx
[pkg]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/package.json
[tsconfig]: file:///Users/emre/Desktop/app-plant-api-app/apps/mobile/tsconfig.json
