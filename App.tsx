import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { MotionProvider } from './src/motion';
import { LaunchScreen } from './src/launch/LaunchScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RealtimeProvider } from './src/realtime/RealtimeProvider';

/** Driver app root. Providers, launch screen, then the navigator. */
export default function App(): React.JSX.Element {
  const [launched, setLaunched] = useState(false);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Outside every provider: a throw inside one of them would otherwise
          leave a blank view mid-delivery, escapable only by force-quitting. */}
      <ErrorBoundary>
        <SafeAreaProvider>
          <MotionProvider>
            <AuthProvider>
              {/* Inside AuthProvider — it needs the session's token — and
                  around the navigator, so one socket serves every screen. */}
              <RealtimeProvider>
                <StatusBar style="auto" />
                <RootNavigator />
                {!launched ? <LaunchScreen onFinish={() => setLaunched(true)} /> : null}
              </RealtimeProvider>
            </AuthProvider>
          </MotionProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
