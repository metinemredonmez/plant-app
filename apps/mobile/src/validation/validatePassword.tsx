import {showMessage} from 'react-native-flash-message';

export const validatePassword = (password: string, iconValidation = false) => {
  if (!password.trim()) {
    showMessage({
      message: 'Error',
      description: 'Please fill password field',
      type: 'danger',
      icon: 'danger',
    });
    return false;
  }

  if (password.trim().length < 8) {
    showMessage({
      message: 'Error',
      description: 'Password must be at least 8 characters',
      type: 'danger',
      icon: 'danger',
    });
    return false;
  }

  if (iconValidation) {
    return true;
  }
};
