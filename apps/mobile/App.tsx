import {useFonts} from 'expo-font';
import {Provider} from 'react-redux';
import React, {useCallback} from 'react';
import Loader from './src/components/Loader';
import {persistor, store} from './src/store';
import {actions} from './src/store/actions';
import * as SplashScreen from 'expo-splash-screen';
import FlashMessage from './src/components/FlashMessage';
import Orientation from 'react-native-orientation-locker';
import {PersistGate} from 'redux-persist/integration/react';
import StackNavigator from './src/navigation/StackNavigator';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// "Remember me" left unticked: the session lasts until the app is closed.
const forgetUnrememberedSession = () => {
  const {user, rememberMe} = store.getState().userSlice;
  if (user && !rememberMe) {
    store.dispatch(actions.logOut());
  }
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'DMSans-Bold': require('./src/assets/fonts/DMSans-Bold.ttf'),
    'DMSans-Medium': require('./src/assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Regular': require('./src/assets/fonts/DMSans-Regular.ttf'),
    'Inter-Bold': require('./src/assets/fonts/Inter-Bold.ttf'),
    'Inter-Medium': require('./src/assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('./src/assets/fonts/Inter-SemiBold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
      Orientation.lockToPortrait();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <Provider store={store}>
        <PersistGate
          loading={<Loader />}
          persistor={persistor}
          onBeforeLift={forgetUnrememberedSession}
        >
          <NavigationContainer>
            <StackNavigator />
          </NavigationContainer>
        </PersistGate>
      </Provider>
      <FlashMessage />
    </SafeAreaProvider>
  );
}
