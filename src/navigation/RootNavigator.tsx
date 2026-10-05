import { DarkTheme, DefaultTheme, NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAuth } from '../auth/AuthProvider';
import { useReducedMotion } from '../motion';
import { RootStackParamList } from './types';
import { DeliveryDetailScreen } from '../screens/DeliveryDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProofOfDeliveryScreen } from '../screens/ProofOfDeliveryScreen';
import { useTheme } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function navTheme(background: string, card: string, text: string, primary: string, border: string, dark: boolean): NavTheme {
  const base = dark ? DarkTheme : DefaultTheme;
  return { ...base, colors: { ...base.colors, background, card, text, primary, border } };
}

/** Driver navigation: login when signed out, else the job list and detail. */
export function RootNavigator(): React.JSX.Element {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const animation = reduceMotion ? 'none' : 'slide_from_right';

  return (
    <NavigationContainer
      theme={navTheme(theme.colors.background, theme.colors.surface, theme.colors.text, theme.colors.primary, theme.colors.border, theme.scheme === 'dark')}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation, contentStyle: { backgroundColor: theme.colors.background } }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
            <Stack.Screen name="ProofOfDelivery" component={ProofOfDeliveryScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
