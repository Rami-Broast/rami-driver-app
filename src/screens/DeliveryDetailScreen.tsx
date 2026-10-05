import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen, TextField } from '../components/ui';
import { deliveryFlow } from '../delivery/delivery-flow';
import { useAsync } from '../hooks/useAsync';
import { useLocationSharing } from '../hooks/useLocationSharing';
import { AppMap, DEFAULT_REGION, MapMarker } from '../maps/AppMap';
import { BottomSheet, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';
import { hasPin, navigationUrl } from '../util/navigationUrl';

/** One delivery: map, address, and the driver's next action. */
export function DeliveryDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'DeliveryDetail'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { id } = route.params;
  const { data: delivery, loading, error, reload } = useAsync(() => api.delivery(id), [id]);
  /**
   * The branch this order came from, for its phone number.
   *
   * Fetched separately and failing to `[]`, because it is a convenience: a
   * branch list that will not load must cost the Call button and nothing else.
   * The delivery itself is what this screen is for.
   */
  const branches = useAsync(() => api.branches().catch(() => []), []);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [cashOpen, setCashOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState('');

  // Returning from the proof-of-delivery screen (or any push) should reflect the
  // new state — useAsync only refetches on id change, so refresh on focus.
  useEffect(() => navigation.addListener('focus', reload), [navigation, reload]);

  // Share the driver's position while they are carrying this order, so the
  // customer tracking it sees the driver move. Starts at pickup, stops at
  // drop-off — see `delivery/location-sharing.ts`.
  useLocationSharing(api, delivery?.status);

  const flow = delivery ? deliveryFlow(delivery.status) : null;
  const addr = delivery?.addressSnapshot ?? null;
  const lat = addr?.latitude ?? null;
  const lng = addr?.longitude ?? null;

  const currentLoc = async (): Promise<{ latitude?: number; longitude?: number }> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch {
      // ignore
    }
    return {};
  };

  const runAction = async (): Promise<void> => {
    if (!delivery || !flow?.action) {
      return;
    }
    // Delivery completion captures proof on its own screen.
    if (flow.action.key === 'delivered') {
      navigation.navigate('ProofOfDelivery', { id: delivery.id });
      return;
    }
    setBusy(true);
    try {
      const loc = await currentLoc();
      if (flow.action.key === 'picked-up') {
        await api.markPickedUp(delivery.id, loc);
      } else {
        await api.markOutForDelivery(delivery.id, loc);
      }
      reload();
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Action failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitFail = async (): Promise<void> => {
    if (!delivery || failReason.trim().length === 0) {
      return;
    }
    setBusy(true);
    try {
      await api.markFailed(delivery.id, failReason.trim());
      setFailOpen(false);
      reload();
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Could not report the problem.');
    } finally {
      setBusy(false);
    }
  };

  const submitCash = async (): Promise<void> => {
    if (!delivery) {
      return;
    }
    const major = Number(cashAmount.replace(',', '.'));
    if (!Number.isFinite(major) || major < 0) {
      setToast('Enter a valid amount.');
      return;
    }
    const collectedMinor = Math.round(major * 100);
    setBusy(true);
    try {
      const record = await api.recordCashCollected(delivery.id, { collectedMinor });
      setCashOpen(false);
      setCashAmount('');
      const variance = record.varianceMinor;
      setToast(
        variance === 0
          ? 'Cash recorded — exact amount.'
          : `Cash recorded — ${variance > 0 ? 'over' : 'short'} by ${formatSar(Math.abs(variance))}.`,
      );
      reload();
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Could not record cash. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // The customer's own pin, opened in Google Maps — the same provider they
  // dropped it in, so the driver is not sent to a subtly different place.
  const pinned = hasPin(lat, lng);

  const openNavigation = (): void => {
    if (!pinned) {
      setToast('No map location on this address — use the written address.');
      return;
    }
    Linking.openURL(navigationUrl(lat as number, lng as number, Platform.OS)).catch(() =>
      setToast('Could not open Google Maps.'),
    );
  };

  const markers: MapMarker[] = pinned
    ? [{ id: 'dest', latitude: lat as number, longitude: lng as number, kind: 'customer', title: 'Delivery address' }]
    : [];

  const branch = branches.data?.find((b) => b.id === delivery?.branchId) ?? null;
  const branchPhone = branch?.phone ?? null;

  /**
   * Rings the branch.
   *
   * This is the only number in the app, and deliberately so. The **customer's**
   * number is never given to a driver — no call-masking provider is contracted,
   * so handing over a raw personal number is not a trade this platform makes —
   * which left a driver stuck at a wrong address with nobody to ring at all.
   * The branch's own number is a published business contact, already printed on
   * every docket, and the branch is who can actually reach the customer.
   *
   * No button at all when the branch has published no number: one that dials
   * nothing is worse than its absence, and a driver only finds out which at the
   * moment they need it.
   */
  const callBranch = (): void => {
    if (!branchPhone) {
      return;
    }
    Linking.openURL(`tel:${branchPhone}`).catch(() => setToast('Could not start the call.'));
  };

  /**
   * Ringing the customer.
   *
   * The number is the customer's own, unmasked — an owner decision that
   * replaced a platform rule withholding it entirely, because a driver at an
   * unmarked gate with a cooling bag and nobody to ring is the failure it
   * answers. **The server decides when**: it sends the number only from pickup
   * onward and strips it otherwise, so this screen shows the button exactly
   * when there is a number to call and never has to know the rule.
   */
  const customerPhone = delivery?.customerPhone ?? null;

  const callCustomer = (): void => {
    if (!customerPhone) {
      return;
    }
    Linking.openURL(`tel:${customerPhone}`).catch(() => setToast('Could not start the call.'));
  };

  const cod = delivery?.isCashOnDelivery ?? false;
  const needsCash = !!delivery && flow?.terminal && delivery.status === 'DELIVERED' && cod && !delivery.cashCollection;

  return (
    <Screen title="Delivery" onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast ?? ''} tone="danger" onHide={() => setToast(null)} />
      {loading ? (
        <View style={{ padding: 16 }}>
          <Skeleton height={220} radius={theme.radius.lg} />
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load delivery" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : delivery && flow ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* The whole map is the button. A driver at a door, one-handed, with
              a bag in the other, aims at the biggest thing on the screen — not
              at a line of text under a card. The small link stays as well, for
              anyone who reads before tapping. */}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={
              pinned
                ? 'Open this delivery address in Google Maps'
                : 'This address has no map location'
            }
            onPress={openNavigation}
          >
            <View style={{ height: 200, borderRadius: theme.radius.lg, overflow: 'hidden' }}>
              <AppMap
                scrollEnabled={false}
                region={pinned ? { latitude: lat as number, longitude: lng as number, latitudeDelta: 0.02, longitudeDelta: 0.02 } : DEFAULT_REGION}
                markers={markers}
              />
            </View>
            <Text
              style={{
                color: pinned ? theme.colors.accent : theme.colors.textMuted,
                fontWeight: '700',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {pinned ? 'Tap the map to navigate in Google Maps' : 'No map pin on this address'}
            </Text>
          </PressableScale>

          <Card>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{delivery.order.orderNumber}</Text>
            {delivery.order.referenceId ? (
              // Order numbers count per branch and repeat across them; this
              // reference is what identifies the order if dispatch asks.
              <Text selectable style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                Ref {delivery.order.referenceId}
              </Text>
            ) : null}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Open this delivery address in Google Maps"
              onPress={openNavigation}
            >
              <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>
                {[addr?.line1, addr?.line2, addr?.district, addr?.city].filter(Boolean).join(', ')}
              </Text>
            </PressableScale>
            {addr?.notes ? <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>Note: {addr.notes}</Text> : null}
            {/* Who to ask for. `recipientName` is captured at drop-off, so
                before that the customer's own name is the only one there is —
                and "ask for Fatimah" is how a driver gets past a reception
                desk. */}
            {delivery.recipientName || delivery.customerName ? (
              <Text style={{ color: theme.colors.text, marginTop: 6 }}>
                Recipient: {delivery.recipientName ?? delivery.customerName}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Open this delivery address in Google Maps"
                onPress={openNavigation}
              >
                <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>
                  🧭 Navigate in Google Maps
                </Text>
              </PressableScale>
              {/* The customer first: at a door, they are who the driver
                  actually needs. The branch is the fallback for when nobody
                  answers, which is the order the two are reached for. */}
              {customerPhone ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Call the customer${
                    delivery.customerName ? `, ${delivery.customerName}` : ''
                  }`}
                  onPress={callCustomer}
                >
                  <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>
                    📱 Call customer
                  </Text>
                </PressableScale>
              ) : null}
              {branchPhone ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${branch?.name ?? 'the branch'}`}
                  onPress={callBranch}
                >
                  <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>
                    📞 Call {branch?.name ?? 'branch'}
                  </Text>
                </PressableScale>
              ) : null}
            </View>
          </Card>

          {/* Cash-on-delivery: what to collect, before it's recorded. */}
          {cod && !delivery.cashCollection && delivery.amountDueMinor !== null ? (
            <Card style={{ borderColor: theme.colors.warning }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>CASH ON DELIVERY</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 20, marginTop: 4 }}>
                Collect {formatSar(delivery.amountDueMinor)}
              </Text>
            </Card>
          ) : null}

          {/* Cash already recorded. */}
          {delivery.cashCollection ? (
            <Card>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>CASH COLLECTED</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18, marginTop: 4 }}>
                {formatSar(delivery.cashCollection.collectedMinor)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 13 }}>
                Due {formatSar(delivery.cashCollection.expectedMinor)}
                {delivery.cashCollection.varianceMinor !== 0
                  ? ` · ${delivery.cashCollection.varianceMinor > 0 ? 'over' : 'short'} ${formatSar(Math.abs(delivery.cashCollection.varianceMinor))}`
                  : ' · exact'}
              </Text>
            </Card>
          ) : null}

          {flow.terminal && !needsCash ? (
            <Card>
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>This delivery is {flow.label.toLowerCase()}.</Text>
            </Card>
          ) : null}

          {needsCash ? <PrimaryButton label="Record cash collected" onPress={() => setCashOpen(true)} /> : null}

          {!flow.terminal && flow.action ? (
            <>
              <PrimaryButton label={flow.action.label} onPress={runAction} busy={busy} />
              {flow.canFail ? (
                <PressableScale accessibilityRole="button" onPress={() => setFailOpen(true)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Report a problem</Text>
                </PressableScale>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      ) : null}

      <BottomSheet visible={failOpen} onClose={() => setFailOpen(false)}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Report a problem</Text>
        <TextField label="What happened?" value={failReason} onChangeText={setFailReason} placeholder="e.g. Customer unreachable" maxLength={500} />
        <PrimaryButton label="Submit" onPress={submitFail} busy={busy} disabled={failReason.trim().length === 0} />
      </BottomSheet>

      <BottomSheet visible={cashOpen} onClose={() => setCashOpen(false)}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Record cash collected</Text>
        {delivery?.amountDueMinor !== null && delivery?.amountDueMinor !== undefined ? (
          <Text style={{ color: theme.colors.textMuted, marginBottom: 12 }}>Amount due: {formatSar(delivery.amountDueMinor)}</Text>
        ) : null}
        <TextField label="Cash received (SAR)" value={cashAmount} onChangeText={setCashAmount} placeholder="0.00" keyboardType="decimal-pad" maxLength={12} />
        <PrimaryButton label="Save" onPress={submitCash} busy={busy} disabled={cashAmount.trim().length === 0} />
      </BottomSheet>
    </Screen>
  );
}
