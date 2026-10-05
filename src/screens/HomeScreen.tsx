import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Switch, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { deliveryFlow, isActiveDelivery } from '../delivery/delivery-flow';
import { legOf, runOrder, runSummary } from '../delivery/run';
import { shiftSummary } from '../delivery/shift-summary';
import { formatSar } from '../util/money';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { RealtimeEvent, useRealtimeReload } from '../realtime/RealtimeProvider';
import { DeliveryStatus } from '../types/backend';
import { useTheme } from '../theme/theme';
import { APP_VERSION } from '../version';

/**
 * The pushes this screen reacts to.
 *
 * Both are about this driver and nobody else — the backend emits them into a
 * per-driver room. `delivery.unassigned` matters as much as the assignment: a
 * job taken back at the counter has to leave this list straight away, or a
 * driver sets off for a pickup somebody else is already doing.
 *
 * Module-scoped because a new array each render would re-bind the listeners on
 * every render.
 */
const REALTIME_EVENTS: RealtimeEvent[] = ['delivery.assigned', 'delivery.unassigned'];

/**
 * How often the assigned-delivery list is refetched while the driver is online.
 *
 * A driver is told about a new job by this poll and nothing else — there is no
 * socket in this app and push is still mocked. Eight seconds matches the POS
 * board, which is the house precedent for "a screen someone is waiting at".
 *
 * The list was previously fetched once on mount with an empty dependency array:
 * no poll, no socket, no push, no pull-to-refresh, and no refetch on focus. A
 * driver went online, saw "No deliveries yet", and it stayed that way for the
 * whole shift unless they force-quit and relaunched — while the assignment sat
 * on the server the entire time.
 */
const REFRESH_INTERVAL_MS = 8000;

/**
 * How long a just-assigned job is highlighted as new.
 *
 * A driver looking at the screen when a job lands needs the change to be
 * visible; one who picks the phone up a minute later needs the list to read
 * normally. Measured from the assignment, not from when the app noticed.
 */
const NEW_JOB_WINDOW_MS = 60_000;

/** Driver home: shift toggle, active job, and assigned deliveries. */
export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>): React.JSX.Element {
  const theme = useTheme();
  const { api, signOut } = useAuth();
  const profile = useAsync(() => api.me(), []);
  const deliveries = useAsync(() => api.deliveries(), []);
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const online = profile.data?.isOnline ?? false;

  const reloadAll = useCallback(() => {
    deliveries.reload();
    profile.reload();
    // `reload` is a stable useCallback on each async state; depending on the
    // whole state object would give this a new identity on every fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries.reload, profile.reload]);

  // Poll while online. Deliberately not while offline: an offline driver is not
  // being assigned anything, and a background timer on a phone in a pocket is
  // battery nobody agreed to spend.
  useEffect(() => {
    if (!online) {
      return;
    }
    const timer = setInterval(reloadAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, reloadAll]);

  /**
   * The push that makes a job arrive rather than turn up.
   *
   * Deliberately not gated on `online`, unlike the poll above. The poll's gate
   * is a battery decision about a timer; this is one already-open socket, and
   * gating it would mean a driver who was assigned a job in the second before
   * their profile finished loading waits out the full interval for it. The
   * hook also fires once on every reconnect, so a job assigned while the phone
   * was in a lift is on screen the moment signal returns.
   *
   * The poll stays as the floor — see `RealtimeProvider`.
   */
  useRealtimeReload(REALTIME_EVENTS, reloadAll);

  // Refetch when the driver comes back from a delivery. The native stack keeps
  // this screen mounted, so without this, returning from a completed drop-off
  // shows the job still sitting in the list.
  useFocusEffect(reloadAll);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reloadAll();
    // The reloads are fire-and-forget; releasing the spinner on the next tick
    // keeps the gesture feeling answered without tracking two async states.
    setTimeout(() => setRefreshing(false), 600);
  }, [reloadAll]);

  /**
   * Stepping away without clocking off.
   *
   * This matters more than it used to. A busy driver can now be given another
   * drop, so `isAvailable` no longer falls out of holding a job — it is the
   * driver's own "don't give me anything for a bit", and the backend reads the
   * active-job count precisely so that a break and a full bag stay different
   * things. Without this switch the only way to stop the flow was going
   * offline, which also hides the jobs already in hand.
   */
  const toggleBreak = async (next: boolean): Promise<void> => {
    setToggling(true);
    try {
      await api.setAvailability(!next);
      profile.reload();
    } catch {
      // The switch simply does not move. The server is the truth and the next
      // poll restores it; a driver on a doorstep does not need a dialog.
      profile.reload();
    } finally {
      setToggling(false);
    }
  };

  const toggleOnline = async (next: boolean): Promise<void> => {
    setToggling(true);
    try {
      if (next) {
        await Location.requestForegroundPermissionsAsync();
      }
      await api.setOnline(next);
      profile.reload();
    } finally {
      setToggling(false);
    }
  };

  // Skeleton only before the first successful load, never on a poll. `useAsync`
  // raises `loading` on every reload, so keying the skeleton off it directly
  // would blink the whole list away every eight seconds — the POS board avoids
  // the same thing with a "have I ever loaded" flag.
  const firstLoad = deliveries.loading && deliveries.data === null;
  // A poll that fails while a good list is already on screen must not replace
  // it with an error: the driver is mid-shift and the previous list is still
  // the truth as far as they need it. Only a failure with nothing to show does.
  const loadError = deliveries.data === null ? deliveries.error : null;

  const list = deliveries.data?.data ?? [];
  // In the order to work them, not the order they arrived: everything still at
  // a branch first, then everything already in the bag, oldest first within
  // each. A driver holding three jobs should not have to work the sequence out
  // at a kerb. It is a suggestion — every card stays tappable.
  const active = runOrder(list.filter((d) => isActiveDelivery(d.status)));
  const rest = list.filter((d) => !isActiveDelivery(d.status));
  const run = runSummary(active);
  const today = shiftSummary(list);

  // A break is only possible between jobs — the backend refuses it outright
  // while a driver holds work, because availability is system-controlled for
  // the duration of a job. Showing a switch that will be refused is worse than
  // not showing one.
  const canTakeBreak = online && active.length === 0;
  const onBreak = online && !(profile.data?.isAvailable ?? true);

  return (
    <Screen
      title={profile.data ? profile.data.user.fullName.split(' ')[0] ?? 'Driver' : 'Driver'}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <PressableScale accessibilityRole="button" accessibilityLabel="History" onPress={() => navigation.navigate('History')}>
            <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>History</Text>
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => void signOut()}>
            <Text style={{ color: theme.colors.textMuted, fontWeight: '600' }}>Sign out</Text>
          </PressableScale>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>{online ? 'You’re online' : 'You’re offline'}</Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>{online ? 'Receiving assignments' : 'Go online to receive jobs'}</Text>
            </View>
            <Switch value={online} onValueChange={toggleOnline} disabled={toggling} trackColor={{ true: theme.colors.primary }} />
          </View>

          {canTakeBreak ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Taking a break</Text>
                <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>
                  {onBreak ? 'You won’t be given new jobs' : 'Stay online, pause new jobs'}
                </Text>
              </View>
              <Switch
                value={onBreak}
                onValueChange={toggleBreak}
                disabled={toggling}
                trackColor={{ true: theme.colors.primary }}
              />
            </View>
          ) : null}
        </Card>

        {/* What today has actually been. Deliberately no earnings figure: the
            platform has no driver-pay model, so a number called "earned" would
            be invented — and the cash line is the one that matters at the end
            of a shift, because somebody has to hand it over. */}
        {online || today.delivered > 0 || today.cashCollectedMinor > 0 ? (
          <Card>
            <Text style={{ color: theme.colors.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>
              TODAY
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 20 }}>
              <Stat label="Delivered" value={String(today.delivered)} />
              {today.failed > 0 ? <Stat label="Failed" value={String(today.failed)} /> : null}
              {today.cashCollectedMinor > 0 ? (
                <Stat label="Cash held" value={formatSar(today.cashCollectedMinor)} />
              ) : null}
            </View>
          </Card>
        ) : null}

        {firstLoad ? (
          <Skeleton height={90} radius={theme.radius.lg} />
        ) : loadError ? (
          <ErrorState title="Couldn’t load deliveries" message={loadError.message} actionLabel="Retry" onAction={deliveries.reload} />
        ) : list.length === 0 ? (
          <EmptyState glyph="🛵" title="No deliveries yet" message="Assigned jobs will appear here." />
        ) : (
          <>
            {run.label ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ color: theme.colors.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>
                  YOUR RUN
                </Text>
                {/* "2 to collect · 1 to deliver" is the sentence a courier
                    wants before setting off. "3 jobs" is the one that makes
                    them open all three. */}
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{run.label}</Text>
              </View>
            ) : null}
            {active.map((d, i) => (
              <DeliveryRow
                key={d.id}
                d={d}
                isNew={isJustAssigned(d)}
                // Numbered only when there is more than one, so a single job
                // does not read as the first of a list that does not exist.
                position={active.length > 1 ? i + 1 : undefined}
                onPress={() => navigation.navigate('DeliveryDetail', { id: d.id })}
              />
            ))}
            {rest.length > 0 ? (
              <Text style={{ color: theme.colors.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginTop: 8 }}>OTHER</Text>
            ) : null}
            {rest.map((d) => (
              <DeliveryRow key={d.id} d={d} onPress={() => navigation.navigate('DeliveryDetail', { id: d.id })} />
            ))}
          </>
        )}
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          Rami Broast Driver · v{APP_VERSION}
        </Text>
      </ScrollView>
    </Screen>
  );
}

/**
 * Whether a job landed in the last minute and should still read as new.
 *
 * Reads `assignedAt` rather than tracking arrivals in state, so it is right
 * after a reconnect, a relaunch, or a phone taken out of a pocket — the three
 * cases where "arrived while you were watching" is exactly what a driver
 * cannot tell. An unparseable or missing timestamp is simply not new; a badge
 * is not worth a wrong date.
 */
function isJustAssigned(d: { status: DeliveryStatus; assignedAt: string | null }): boolean {
  if (d.status !== 'ASSIGNED' || !d.assignedAt) {
    return false;
  }
  const at = Date.parse(d.assignedAt);
  return Number.isFinite(at) && Date.now() - at < NEW_JOB_WINDOW_MS;
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 18 }}>{value}</Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function DeliveryRow({
  d,
  isNew,
  position,
  onPress,
}: {
  d: {
    id: string;
    status: DeliveryStatus;
    order: { orderNumber: string };
    addressSnapshot: { line1?: string; city?: string } | null;
  };
  isNew?: boolean;
  /** 1-based place in the run. Absent when there is only one job. */
  position?: number;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const flow = deliveryFlow(d.status);
  const leg = legOf(d.status);
  const toneColor = flow.tone === 'success' ? theme.colors.success : flow.tone === 'danger' ? theme.colors.danger : theme.colors.primary;
  return (
    <PressableScale
      accessibilityRole="button"
      // Spoken as one sentence, because a driver using a screen reader at a
      // door should not have to walk three separate labels to know what this
      // card is.
      accessibilityLabel={`${isNew ? 'New job. ' : ''}${
        position ? `Stop ${position}. ` : ''
      }Order ${d.order.orderNumber}. ${flow.label}.`}
      onPress={onPress}
    >
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            {position ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '800' }}>{position}</Text>
              </View>
            ) : null}
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{d.order.orderNumber}</Text>
            {isNew ? (
              <View
                style={{
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.pill,
                  paddingVertical: 2,
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{ color: theme.colors.onPrimary, fontSize: 11, fontWeight: '800' }}>NEW</Text>
              </View>
            ) : null}
          </View>
          <View style={{ backgroundColor: toneColor, borderRadius: theme.radius.pill, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '700' }}>{flow.label}</Text>
          </View>
        </View>
        <Text style={{ color: theme.colors.textMuted, marginTop: 6 }} numberOfLines={1}>
          {/* The leg first, because it is the only word that changes what the
              driver does next: a job to collect sends them to a branch and one
              to deliver sends them to a door, and the addresses on the card are
              always the customer's. */}
          {leg === 'collect' ? 'Collect · ' : leg === 'deliver' ? 'Deliver to · ' : ''}
          {[d.addressSnapshot?.line1, d.addressSnapshot?.city].filter(Boolean).join(', ') || 'Address on next screen'}
        </Text>
      </Card>
    </PressableScale>
  );
}
