import React from 'react';
import {View, Alert, ScrollView} from 'react-native';

import {hooks} from '../../hooks';
import {utils} from '../../utils';
import {items} from '../../items';
import {svg} from '../../assets/svg';
import {components} from '../../components';

const Profile: React.FC = () => {
  const navigation = hooks.useAppNavigation();

  const user = hooks.useAppSelector(state => state.userSlice.user);

  const emailVerified = user?.emailVerified || false;
  const phoneVerified = user?.phoneVerified || false;

  const phoneVerifiedAlert = (): void => {
    Alert.alert(
      'Phone number is verified',
      'Your phone number is already verified.',
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

  const emailVerifiedAlert = (): void => {
    Alert.alert(
      'Email is verified',
      'Your email is already verified.',
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

  const renderUserInfo = (): JSX.Element => {
    return (
      <components.UserData
        onPress={() => {
          if (user?.emailVerified && user?.phoneVerified) {
            navigation.navigate('EditProfile');
            return;
          }

          Alert.alert(
            'Please verify your email and phone number',
            'You need to verify your email and phone number to edit your profile.',
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
        }}
        containerStyle={{marginBottom: utils.responsiveHeight(30)}}
      />
    );
  };

  const renderMenu = (): JSX.Element => {
    return (
      <View style={{paddingLeft: 20}}>
        <items.ProfileItem
          title={'Personal info'}
          onPress={() => {
            navigation.navigate('EditProfile');
          }}
          icon={<svg.UserSvg />}
          goNavigation={true}
          containerStyle={{marginBottom: utils.responsiveHeight(10)}}
        />
        <items.ProfileItem
          title={'My orders'}
          onPress={() => {
            if (phoneVerified && emailVerified) {
              navigation.navigate('OrderHistory');
              return;
            }

            Alert.alert(
              'Please verify your email and phone number',
              'You need to verify your email and phone number to see your orders.',
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
          }}
          containerStyle={{
            marginBottom: utils.responsiveHeight(10),
          }}
          goNavigation={true}
          icon={<svg.ServerSvg />}
        />
        <items.ProfileItem
          title={'Promocodes & gift cards'}
          onPress={() => {
            navigation.navigate('MyPromocodes');
          }}
          containerStyle={{
            marginBottom: utils.responsiveHeight(10),
          }}
          icon={<svg.GiftSvg />}
          goNavigation={true}
        />
        <items.ProfileItem
          title={
            phoneVerified
              ? 'Your phone number is verified'
              : 'Verify phone number'
          }
          onPress={() => {
            phoneVerified
              ? phoneVerifiedAlert()
              : navigation.navigate('SendPhoneOtp');
          }}
          goNavigation={!phoneVerified}
          icon={<svg.SmartphoneSvg phoneVerified={phoneVerified} />}
          containerStyle={{marginBottom: utils.responsiveHeight(10)}}
        />
        <items.ProfileItem
          title={emailVerified ? 'Your email is verified' : 'Verify email'}
          onPress={() => {
            emailVerified
              ? emailVerifiedAlert()
              : navigation.navigate('SendEmailOtp');
          }}
          goNavigation={!emailVerified}
          icon={<svg.MailSvg emailVerified={emailVerified} />}
          containerStyle={{marginBottom: utils.responsiveHeight(10)}}
        />
        <items.ProfileItem
          title='Sign out'
          onPress={() => {
            navigation.navigate('LogOut');
          }}
          icon={<svg.SignOutSvg />}
          containerStyle={{marginBottom: utils.responsiveHeight(10)}}
        />
        <items.ProfileItem
          title='Delete account'
          onPress={() => {
            navigation.navigate('DeleteAccount');
          }}
          icon={<svg.DeleteSvg />}
        />
      </View>
    );
  };

  const renderContent = (): JSX.Element => {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: utils.responsiveHeight(50),
          paddingBottom: utils.responsiveHeight(20),
        }}
        showsVerticalScrollIndicator={false}
      >
        {renderUserInfo()}
        {renderMenu()}
      </ScrollView>
    );
  };

  return renderContent();
};

export default Profile;
