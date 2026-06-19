/**
 * HealWin Patient — bare React Native app entry.
 * @format
 */
import React, { useEffect, useState } from 'react';
import { Alert, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

import { RootNavigator } from './src/navigation/RootNavigator';
import { authStore } from './src/state/authStore';
import { initPush, subscribeForeground, setPushNavigator } from './src/services/push';
import { NAV_STATE_KEY } from './src/api/storage';
import type { RootStackParamList } from './src/navigation/types';
import { colors } from './src/theme';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function App(): React.JSX.Element {
  // Persist + restore the navigation stack so reopening the app returns the
  // user to the exact screen they were on (point: "jis page pr hain usi pr rahe").
  const [navReady, setNavReady] = useState(false);
  const [initialState, setInitialState] = useState<any>(undefined);

  useEffect(() => {
    void authStore.bootstrap();

    // Push notifications: register device, route taps, show foreground alerts.
    void initPush();
    setPushNavigator((route, data) => {
      const screen = (data?.screen as keyof RootStackParamList) || 'Notifications';
      if (navigationRef.isReady()) (navigationRef.navigate as any)(screen, data);
    });
    const unsub = subscribeForeground((title, body) => {
      if (title || body) Alert.alert(title, body);
    });

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(NAV_STATE_KEY);
        if (saved) setInitialState(JSON.parse(saved));
      } catch {
        /* ignore corrupt state */
      } finally {
        setNavReady(true);
      }
    })();

    return unsub;
  }, []);

  if (!navReady) return <SafeAreaProvider />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer
        ref={navigationRef}
        initialState={initialState}
        onStateChange={(state) => {
          AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state)).catch(() => undefined);
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
