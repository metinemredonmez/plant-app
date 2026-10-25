import React from 'react';
import {ScrollView} from 'react-native';

import {text} from '../text';
import {hooks} from '../hooks';
import {utils} from '../utils';
import {custom} from '../custom';
import {components} from '../components';
import {actions} from '../store/actions';
import {SignUpAccountCreatedScreenProps} from '../types/ScreenProps';

const SignUpAccountCreated: React.FC<SignUpAccountCreatedScreenProps> = ({
  route,
}) => {
  const dispatch = hooks.useAppDispatch();
  const {session} = route.params;
  const navigation = hooks.useAppNavigation();

  const loading = false;

  // Sign-up already returned a session, so there is no second login with
  // the plain password carried over from the previous screen.
  const handleSignIn = () => {
    if (!session) {
      navigation.reset({
        index: 0,
        routes: [{name: 'SignIn'}],
      });
      return;
    }

    dispatch(actions.setRememberMe(true));
    dispatch(actions.startSession(session));
  };

  const renderContent = (): JSX.Element => {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          justifyContent: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <custom.Image
          source={require('../assets/icons/01.png')}
          style={{
            height: utils.responsiveHeight(120),
            aspectRatio: 123.39 / 120,
            marginBottom: utils.responsiveHeight(20),
          }}
        />
        <text.H2
          style={{
            textTransform: 'capitalize',
            marginBottom: utils.responsiveHeight(14),
          }}
        >
          Account Created!
        </text.H2>
        <text.T16>
          Your account had been created {'\n'}
          successfully.
        </text.T16>
      </ScrollView>
    );
  };

  const renderButton = (): JSX.Element => {
    return (
      <components.Button
        loading={loading}
        title='shop now'
        containerStyle={{margin: 20}}
        onPress={() => {
          handleSignIn();
        }}
      />
    );
  };

  return (
    <custom.SafeAreaView insets={['top', 'bottom']}>
      {renderContent()}
      {renderButton()}
    </custom.SafeAreaView>
  );
};

export default SignUpAccountCreated;
