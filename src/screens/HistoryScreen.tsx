import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Delivery } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';

function formatDate(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The driver's completed and failed deliveries, plus the cash they handled.
 *
 * Note on "earnings": the platform has **no driver-pay model** — per-delivery
 * pay/commission is a business input the backend does not hold, so this screen
 * does not invent a monetary earnings figure. It shows the delivery record and
 * the COD cash the driver handled (both real data). When a payout model is
 * added to the backend, an earnings summary can be layered on here.
 */
export function HistoryScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'History'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const delivered = useAsync(() => api.deliveries('DELIVERED'), []);
  const failed = useAsync(() => api.deliveries('FAILED'), []);

  const loading = delivered.loading || failed.loading;
  const error = delivered.error ?? failed.error;
  const doneList = delivered.data?.data ?? [];
  const failedList = failed.data?.data ?? [];

  const cashHandledMinor = doneList
    .filter((d) => d.cashCollection)
    .reduce((sum, d) => sum + (d.cashCollection?.collectedMinor ?? 0), 0);

  const reloadAll = (): void => {
    delivered.reload();
    failed.reload();
  };

  return (
    <Screen title="History" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={90} radius={theme.radius.lg} />
          <Skeleton height={70} radius={theme.radius.lg} />
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load history" message={error.message} actionLabel="Retry" onAction={reloadAll} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label="Completed" value={String(doneList.length)} tone={theme.colors.success} />
            <StatCard label="Failed" value={String(failedList.length)} tone={theme.colors.danger} />
          </View>

          {cashHandledMinor > 0 ? (
            <Card>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' }}>CASH COLLECTED (COD)</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 22, marginTop: 4 }}>{formatSar(cashHandledMinor)}</Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 12 }}>
                Total cash you reported across delivered cash-on-delivery orders.
              </Text>
            </Card>
          ) : null}

          {doneList.length === 0 && failedList.length === 0 ? (
            <EmptyState glyph="📦" title="No past deliveries" message="Completed and failed deliveries will appear here." />
          ) : (
            <>
              {doneList.length > 0 ? <SectionTitle text="COMPLETED" /> : null}
              {doneList.map((d) => (
                <HistoryRow key={d.id} d={d} />
              ))}
              {failedList.length > 0 ? <SectionTitle text="FAILED" /> : null}
              {failedList.map((d) => (
                <HistoryRow key={d.id} d={d} failed />
              ))}
            </>
          )}

          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
            Per-delivery pay isn’t shown — the payout rate is a business setting the platform doesn’t hold yet.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: tone, fontWeight: '800', fontSize: 26, marginTop: 4 }}>{value}</Text>
    </Card>
  );
}

function SectionTitle({ text }: { text: string }): React.JSX.Element {
  const theme = useTheme();
  return <Text style={{ color: theme.colors.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginTop: 8 }}>{text}</Text>;
}

function HistoryRow({ d, failed }: { d: Delivery; failed?: boolean }): React.JSX.Element {
  const theme = useTheme();
  const when = formatDate(failed ? d.failedAt : d.deliveredAt);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{d.order.orderNumber}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{when}</Text>
      </View>
      <Text style={{ color: theme.colors.textMuted, marginTop: 6 }} numberOfLines={1}>
        {[d.addressSnapshot?.line1, d.addressSnapshot?.city].filter(Boolean).join(', ') || '—'}
      </Text>
      {failed && d.failureReason ? (
        <Text style={{ color: theme.colors.danger, marginTop: 6, fontSize: 13 }}>Reason: {d.failureReason}</Text>
      ) : null}
      {!failed && d.cashCollection ? (
        <Text style={{ color: theme.colors.text, marginTop: 6, fontSize: 13 }}>
          Cash collected: {formatSar(d.cashCollection.collectedMinor)}
          {d.cashCollection.varianceMinor !== 0
            ? ` (${d.cashCollection.varianceMinor > 0 ? '+' : ''}${formatSar(d.cashCollection.varianceMinor)} vs due)`
            : ''}
        </Text>
      ) : null}
    </Card>
  );
}
