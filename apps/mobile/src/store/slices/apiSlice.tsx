import {ENDPOINTS} from '../../config';
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import {
  UserType,
  PotType,
  PlantType,
  ColorType,
  BannerType,
  ProductType,
  CategoryType,
  CarouselType,
  PromocodeType,
} from '../../types';

import {userSlice} from '../slices/userSlice';
import {accessToken, refreshSession} from '../../api/client';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: ENDPOINTS.BASE_URL,
  prepareHeaders: headers => {
    const token = accessToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

/** Renews the session once on 401 and repeats the request. */
const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && (await refreshSession())) {
    result = await rawBaseQuery(args, api, extraOptions);
  }
  return result;
};

// 401: no valid session, 403: the stored user is not this session's,
// 404: the account was deleted. Network errors and 5xx keep the session.
const ENDS_SESSION = [401, 403, 404];

export const apiSlice = createApi({
  reducerPath: 'apiSlice',
  baseQuery,
  endpoints: builder => ({
    // ############ GET USER BY ID ############ //
    getUser: builder.query<UserType | null, number>({
      query: userId => `${ENDPOINTS.GET_USER}/${userId}`,
      async onQueryStarted(_, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          if (!data) {
            dispatch(userSlice.actions.logOut());
          }

          if (data) {
            dispatch(userSlice.actions.setUser(data));
          }
        } catch (error) {
          const status = (error as {error?: FetchBaseQueryError}).error
            ?.status;
          if (typeof status === 'number' && ENDS_SESSION.includes(status)) {
            dispatch(userSlice.actions.logOut());
          }
        }
      },
    }),
    // ############ GET ORDERS BY USER ID ############ //
    getOrders: builder.query<any, number>({
      query: userId => `${ENDPOINTS.GET_ORDERS}/${userId}`,
    }),
    // ############ GET REVIEWS BY PRODUCT ID ############ //
    getReviews: builder.query<any, any | any>({
      query: productId => `${ENDPOINTS.GET_REVIEWS}/${productId}`,
    }),
    // ############ GET CAROUSEL ############ //
    getCarousel: builder.query<{carousel: CarouselType[]}, void>({
      query: () => ENDPOINTS.GET_CAROUSEL,
      transformResponse: (response: string) => ({
        carousel: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET PROMOCODES ############ //
    getPromocodes: builder.query<{promocodes: PromocodeType[]}, void>({
      query: () => ENDPOINTS.GET_PROMOCODES,
      transformResponse: (response: string) => ({
        promocodes: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET COLORS ############ //
    getColors: builder.query<{colors: ColorType[]}, void>({
      query: () => ENDPOINTS.GET_COLORS,
      transformResponse: (response: string) => ({
        colors: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET PLANTS ############ //
    getPlants: builder.query<{plants: ProductType[]}, void>({
      query: () => ENDPOINTS.GET_PLANTS,
      transformResponse: (response: ProductType) => ({
        plants: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET POT TYPES ############ //
    getPotTypes: builder.query<{potTypes: PotType[]}, void>({
      query: () => ENDPOINTS.GET_POT_TYPES,
      transformResponse: (response: string) => ({
        potTypes: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET PLANT TYPES ############ //
    getPlantTypes: builder.query<{plantTypes: PlantType[]}, void>({
      query: () => ENDPOINTS.GET_PLANT_TYPES,
      transformResponse: (response: string) => ({
        plantTypes: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET BANNERS ############ //
    getBanners: builder.query<{banners: BannerType[]}, void>({
      query: () => ENDPOINTS.GET_BANNERS,
      transformResponse: (response: BannerType) => ({
        banners: Array.isArray(response) ? response : [],
      }),
    }),
    // ############ GET CATEGORIES ############ //
    getCategories: builder.query<{categories: CategoryType[]}, void>({
      query: () => ENDPOINTS.GET_CATEGORIES,
      transformResponse: (response: any) => ({
        categories: Array.isArray(response) ? response : [],
      }),
    }),
  }),
});

export const queryHooks = {
  useGetUserQuery: apiSlice.endpoints.getUser.useQuery,
  useGetPlantsQuery: apiSlice.endpoints.getPlants.useQuery,
  useGetOrdersQuery: apiSlice.endpoints.getOrders.useQuery,
  useGetColorsQuery: apiSlice.endpoints.getColors.useQuery,
  useGetReviewsQuery: apiSlice.endpoints.getReviews.useQuery,
  useGetBannersQuery: apiSlice.endpoints.getBanners.useQuery,
  useGetCarouselQuery: apiSlice.endpoints.getCarousel.useQuery,
  useGetPotTypesQuery: apiSlice.endpoints.getPotTypes.useQuery,
  useGetPlantTypesQuery: apiSlice.endpoints.getPlantTypes.useQuery,
  useGetCategoriesQuery: apiSlice.endpoints.getCategories.useQuery,
  useGetPromocodesQuery: apiSlice.endpoints.getPromocodes.useQuery,
};

export default apiSlice.reducer;
