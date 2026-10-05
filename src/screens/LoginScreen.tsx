import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

// React Native resolves image assets through require(); this is the idiomatic form.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.jpeg');

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton, Screen, TextField } from '../components/ui';
import { Toast } from '../motion';
import { useTheme } from '../theme/theme';

/** Driver login: staff email + password. */
export function LoginScreen(): React.JSX.Element {
  const theme = useTheme();
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.details && e.details.length > 0 ? e.details.join(' ') : e.message);
      } else {
        setError('Wrong email or password.');
      }
      setBusy(false);
    }
  };

  const valid = /.+@.+/.test(email) && password.length > 0;

  return (
    <Screen title="Driver sign in">
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />
      <View style={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image source={LOGO} style={{ width: 200, height: 80 }} resizeMode="contain" />
        </View>
        <Text style={{ color: theme.colors.textMuted, marginBottom: 24, textAlign: 'center' }}>Sign in with your driver account.</Text>
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoFocus />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <PrimaryButton label="Sign in" onPress={submit} busy={busy} disabled={!valid} />
      </View>
    </Screen>
  );
}
