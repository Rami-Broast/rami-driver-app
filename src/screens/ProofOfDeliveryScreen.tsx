import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen, TextField } from '../components/ui';
import { SignaturePad } from '../components/SignaturePad';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { CAPTURABLE_PROOF, proofUploader } from '../proof/proof-upload';
import { PROOF_TYPE, ProofType } from '../types/backend';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

const PROOF_LABEL: Record<ProofType, string> = {
  NONE: 'No proof',
  PHOTO: 'Photo',
  SIGNATURE: 'Signature',
  OTP: 'OTP',
};

/**
 * Captures proof of delivery, then marks the delivery delivered.
 *
 * `NONE` completes with no capture. `PHOTO`/`SIGNATURE` capture on-device, hand
 * the capture to the proof-upload port for a URL, then send that URL to the
 * backend — which requires it for those proof types. The upload is a mock until
 * object storage is provisioned (see `src/proof/proof-upload.ts`).
 */
export function ProofOfDeliveryScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ProofOfDelivery'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { id } = route.params;
  const { data: delivery, loading, error, reload } = useAsync(() => api.delivery(id), [id]);

  const [proofType, setProofType] = useState<ProofType>(PROOF_TYPE.NONE);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Seed the recipient from the delivery once, without clobbering edits.
  const seeded = React.useRef(false);
  if (delivery && !seeded.current) {
    seeded.current = true;
    if (delivery.recipientName) {
      setRecipientName(delivery.recipientName);
    }
  }

  const currentLoc = async (): Promise<{ latitude?: number; longitude?: number }> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch {
      // best-effort
    }
    return {};
  };

  const takePhoto = async (fromLibrary: boolean): Promise<void> => {
    try {
      const perm = fromLibrary
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setToast(fromLibrary ? 'Photo library permission is needed.' : 'Camera permission is needed.');
        return;
      }
      const result = fromLibrary
        ? await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images })
        : await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      setToast('Could not open the camera.');
    }
  };

  const readyToSubmit =
    proofType === PROOF_TYPE.NONE ||
    (proofType === PROOF_TYPE.PHOTO && photoUri !== null) ||
    (proofType === PROOF_TYPE.SIGNATURE && signatureSvg !== null);

  const submit = async (): Promise<void> => {
    if (!delivery || !readyToSubmit) {
      return;
    }
    setBusy(true);
    try {
      let proofUrl: string | undefined;
      if (proofType === PROOF_TYPE.PHOTO && photoUri) {
        proofUrl = await proofUploader.upload(delivery.id, { kind: PROOF_TYPE.PHOTO, data: photoUri });
      } else if (proofType === PROOF_TYPE.SIGNATURE && signatureSvg) {
        proofUrl = await proofUploader.upload(delivery.id, { kind: PROOF_TYPE.SIGNATURE, data: signatureSvg });
      }
      const loc = await currentLoc();
      await api.markDelivered(delivery.id, {
        proofType,
        proofUrl,
        recipientName: recipientName.trim() || undefined,
        ...loc,
      });
      navigation.goBack();
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Could not mark delivered. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Proof of delivery" onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast ?? ''} tone="danger" onHide={() => setToast(null)} />
      {loading ? (
        <View style={{ padding: 16 }}>
          <Skeleton height={180} radius={theme.radius.lg} />
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load delivery" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : delivery ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{delivery.order.orderNumber}</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>Choose how you confirmed the drop-off.</Text>
          </Card>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CAPTURABLE_PROOF.map((t) => {
              const selected = proofType === t;
              return (
                <PressableScale
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setProofType(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    alignItems: 'center',
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text style={{ color: selected ? theme.colors.onPrimary : theme.colors.text, fontWeight: '700' }}>{PROOF_LABEL[t]}</Text>
                </PressableScale>
              );
            })}
          </View>

          {proofType === PROOF_TYPE.PHOTO ? (
            <Card>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 220, borderRadius: theme.radius.md, marginBottom: 12 }} resizeMode="cover" />
              ) : (
                <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>Take a photo of the delivered order at the door.</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryButton label={photoUri ? 'Retake' : 'Take photo'} onPress={() => takePhoto(false)} style={{ flex: 1 }} />
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => takePhoto(true)}
                  style={{ flex: 1, paddingVertical: 16, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Choose file</Text>
                </PressableScale>
              </View>
            </Card>
          ) : null}

          {proofType === PROOF_TYPE.SIGNATURE ? (
            <Card>
              <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>Ask the recipient to sign.</Text>
              <SignaturePad onChange={setSignatureSvg} />
            </Card>
          ) : null}

          <TextField label="Recipient name (optional)" value={recipientName} onChangeText={setRecipientName} placeholder="Who received the order" maxLength={160} />

          <PrimaryButton label="Confirm delivered" onPress={submit} busy={busy} disabled={!readyToSubmit} />
        </ScrollView>
      ) : null}
    </Screen>
  );
}
