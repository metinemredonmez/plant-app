import {Alert} from 'react-native';

const alreadyAdded = () => {
  return Alert.alert('Already Added', 'Product already in cart.', [
    {text: 'Cancel', style: 'cancel'},
  ]);
};

const userDeleted = () => {
  return Alert.alert('Success', 'Account deleted successfully', [
    {
      text: 'OK',
      onPress: () => {
        console.log('OK Pressed');
      },
    },
  ]);
};

const somethingWentWrong = () => {
  return Alert.alert('Something went wrong, please try again later');
};

const invalidOtp = () => {
  return Alert.alert('Invalid OTP', 'Please enter valid OTP');
};

const invalidUsernameOrPassword = () => {
  return Alert.alert('Error', 'Invalid username or password', [
    {
      text: 'OK',
      onPress: () => {
        console.log('OK Pressed');
      },
    },
  ]);
};

const userWithThisNameOrEmailAlreadyExists = () => {
  return Alert.alert(
    'Error',
    'User with this name or email already exists',
    [
      {
        text: 'OK',
        onPress: () => {
          console.log('OK Pressed');
        },
      },
    ],
    {cancelable: false},
  );
};

/**
 * Shows the API's own message (e.g. "Yeni kod istemeden önce 60 saniye
 * bekleyin", "Bu kodun süresi dolmuş") or the generic one when there is
 * none, such as on a network error.
 */
const serverError = (error: unknown) => {
  const message = (error as {response?: {data?: {message?: unknown}}})
    ?.response?.data?.message;
  if (typeof message === 'string' && message) {
    return Alert.alert('Error', message);
  }
  return somethingWentWrong();
};

export const alert = {
  invalidOtp,
  serverError,
  userDeleted,
  alreadyAdded,
  somethingWentWrong,
  invalidUsernameOrPassword,
  userWithThisNameOrEmailAlreadyExists,
};
