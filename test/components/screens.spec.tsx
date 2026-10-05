import { NavigationContainer } from '@react-navigation/native';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MotionProvider } from '../../src/motion';
import { Api } from '../../src/api/endpoints';

/**
 * Mounts every driver screen against a stubbed API.
 *
 * A driver hits these screens one-handed, outside, mid-shift. React unmounts
 * the whole tree on an uncaught render error, so a single null from the API is
 * the difference between a working screen and a blank one they can only escape
 * by force-quitting.
 *
 * The data is therefore deliberately awkward: no address snapshot, no
 * recipient, a delivery with no reference, an empty history, and a COD job
 * where the amount is present as well as one where it is not.
 */

/**
 * The stub is built from `Api.prototype`, not hand-listed.
 *
 * A hand-written stub goes stale the moment a screen starts calling something
 * new, and it fails as `api.newThing is not a function` **inside render** —
 * which is the blank screen this suite exists to catch, reported as a test
 * failure with no obvious connection to the change that caused it. The admin
 * app builds its harness the same way, for the same reason.
 *
 * Every method resolves `undefined` by default; each test sets the ones it
 * cares about. `mock`-prefixed so the `jest.mock` factory below may reference
 * it.
 */
const mockApi = Object.fromEntries(
  Object.getOwnPropertyNames(Api.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => [name, jest.fn().mockResolvedValue(undefined)]),
) as Record<keyof Api, jest.Mock>;

jest.mock('../../src/auth/AuthProvider', () => ({
  useAuth: () => ({
    api: mockApi,
    ready: true,
    isAuthenticated: true,
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { DeliveryDetailScreen } from '../../src/screens/DeliveryDetailScreen';
import { HistoryScreen } from '../../src/screens/HistoryScreen';
import { HomeScreen } from '../../src/screens/HomeScreen';

const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as never;

const wrap = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      {/*
        A real NavigationContainer, not a stub: HomeScreen calls
        useFocusEffect to refetch when the driver returns from a delivery, and
        that reads the navigation context rather than the `navigation` prop.
      */}
      <NavigationContainer>
        <MotionProvider>{ui}</MotionProvider>
      </NavigationContainer>
    </SafeAreaProvider>,
  );

const PROFILE = {
  id: 'd1',
  userId: 'u1',
  vehicleType: 'CAR',
  vehiclePlate: null,
  isOnline: true,
  isAvailable: true,
  currentLatitude: null,
  currentLongitude: null,
  user: { fullName: 'Test Driver', email: 'd@test', phone: null },
};

const DELIVERY = {
  id: 'dl1',
  orderId: 'o1',
  branchId: 'b1',
  status: 'ASSIGNED',
  addressSnapshot: { line1: '1 Test Street', city: 'Riyadh' },
  recipientName: 'Customer',
  proofType: 'NONE',
  proofUrl: null,
  assignedAt: '2026-09-01T10:00:00.000Z',
  pickedUpAt: null,
  deliveredAt: null,
  failedAt: null,
  failureReason: null,
  order: {
    orderNumber: '1000000',
    referenceId: '482913066571',
    status: 'READY',
    totalMinor: 11_500,
    currency: 'SAR',
  },
  isCashOnDelivery: false,
  amountDueMinor: null,
  cashCollection: null,
};

beforeEach(() => {
  // `clearAllMocks` wipes the default resolutions the prototype stub was built
  // with, so they are restored here — a mock returning `undefined` from a
  // `.catch()` chain is a `TypeError` on a promise, not a friendly no-op.
  for (const fn of Object.values(mockApi)) {
    fn.mockReset();
    fn.mockResolvedValue(undefined);
  }
  mockApi.me.mockResolvedValue(PROFILE);
  mockApi.deliveries.mockResolvedValue({ data: [DELIVERY] });
  mockApi.delivery.mockResolvedValue(DELIVERY);
  // The branch list is a convenience — the Call button — and every screen must
  // survive it being empty, which is what an unconfigured branch looks like.
  mockApi.branches.mockResolvedValue([]);
});

describe('HomeScreen', () => {
  /**
   * A driver can now be given a second drop while already out, so Home is a
   * run rather than a list. Two things have to be true and neither is visible
   * from a pure test: the run summary reaches the screen, and the cards are
   * numbered so a driver is not working out the sequence at a kerb.
   */
  it('shows the run when the driver is carrying more than one job', async () => {
    mockApi.deliveries.mockResolvedValue({
      data: [
        { ...DELIVERY, id: 'd2', status: 'PICKED_UP', order: { ...DELIVERY.order, orderNumber: '1000001' } },
        { ...DELIVERY, id: 'd1', status: 'ASSIGNED' },
      ],
    });

    const { findByText } = wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);

    expect(await findByText('1 to collect · 1 to deliver')).toBeTruthy();
    expect(await findByText('YOUR RUN')).toBeTruthy();
  });

  /**
   * The break switch. It appears only between jobs, because the backend refuses
   * a break outright while a driver holds work — a switch that will be refused
   * is worse than no switch.
   */
  it('offers a break only when the driver is carrying nothing', async () => {
    mockApi.deliveries.mockResolvedValue({ data: [] });
    const idle = wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);
    expect(await idle.findByText('Taking a break')).toBeTruthy();
    idle.unmount();

    mockApi.deliveries.mockResolvedValue({ data: [{ ...DELIVERY, status: 'ASSIGNED' }] });
    const busy = wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);
    await waitFor(() => expect(mockApi.deliveries).toHaveBeenCalled());
    expect(busy.queryByText('Taking a break')).toBeNull();
  });

  it('shows the driver’s jobs', async () => {
    const { getByText } = wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
  });

  it('renders with no jobs at all', async () => {
    mockApi.deliveries.mockResolvedValue({ data: [] });
    expect(() =>
      wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />).unmount(),
    ).not.toThrow();
  });

  /**
   * The regression that mattered most on this screen.
   *
   * The delivery list was fetched once on mount with an empty dependency array
   * — no poll, no socket, no push, no pull-to-refresh, no refetch on focus. A
   * driver went online, saw "No deliveries yet", and it stayed that way for the
   * whole shift while the assignment sat on the server. Every server-side part
   * of the flow was correct; the driver was simply never told.
   */
  it('keeps refetching while the driver is online, so a new job arrives', async () => {
    jest.useFakeTimers();
    try {
      mockApi.deliveries.mockResolvedValue({ data: [] });
      wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);

      await waitFor(() => expect(mockApi.deliveries).toHaveBeenCalled());
      // The poll only starts once `api.me()` has resolved and reported the
      // driver online — that is the whole point of it — so let that settle
      // before advancing the clock. Without this the timer is advanced past
      // the interval before the interval exists, and the test fails for a
      // reason that has nothing to do with polling.
      await act(async () => {});
      const afterMount = mockApi.deliveries.mock.calls.length;

      // A job is assigned server-side while the driver is looking at the screen.
      mockApi.deliveries.mockResolvedValue({ data: [DELIVERY] });
      await act(async () => {
        jest.advanceTimersByTime(9000);
      });

      expect(mockApi.deliveries.mock.calls.length).toBeGreaterThan(afterMount);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not poll while the driver is offline', async () => {
    jest.useFakeTimers();
    try {
      mockApi.me.mockResolvedValue({ ...PROFILE, isOnline: false });
      wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);

      await waitFor(() => expect(mockApi.deliveries).toHaveBeenCalled());
      const afterMount = mockApi.deliveries.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      // An offline driver is not being assigned anything, and a timer running
      // in a pocket is battery nobody agreed to spend.
      expect(mockApi.deliveries.mock.calls.length).toBe(afterMount);
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * Location is shared only while carrying an order (spec section 24).
   *
   * This screen used to ping every 15 seconds whenever the driver was merely
   * *online*, idle or not — an older effect that was never removed when the
   * real policy landed in `useLocationSharing`. It contradicted the documented
   * privacy posture, doubled the battery cost, and quietly falsified the admin
   * fleet map, which tells owners a free driver's pin is stale.
   */
  it('never reports location from the home screen, however long a driver is online', async () => {
    jest.useFakeTimers();
    try {
      wrap(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />);
      await waitFor(() => expect(mockApi.me).toHaveBeenCalled());

      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });

      expect(mockApi.updateLocation).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('DeliveryDetailScreen', () => {
  const route = { key: 'k', name: 'DeliveryDetail', params: { deliveryId: 'dl1' } } as never;

  it('shows the order number and its 12-digit reference', async () => {
    const { getByText } = wrap(<DeliveryDetailScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
    expect(getByText('Ref 482913066571')).toBeTruthy();
  });

  /**
   * The only phone number in this app, and the reason it is the branch's: a
   * customer's number is never given to a driver (no call-masking provider is
   * contracted), so a driver at a wrong address had nobody to ring from inside
   * the app at all.
   */
  it('offers to ring the branch, and only when the branch has published a number', async () => {
    mockApi.branches.mockResolvedValue([{ id: 'b1', name: 'Olaya', phone: '+966500000000' }]);
    mockApi.delivery.mockResolvedValue({ ...DELIVERY, branchId: 'b1' });

    const withPhone = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );
    expect(await withPhone.findByText('📞 Call Olaya')).toBeTruthy();
    withPhone.unmount();

    // A branch with no published number gets no button. One that dials nothing
    // is worse than its absence — a driver finds out which at the moment they
    // need it.
    mockApi.branches.mockResolvedValue([{ id: 'b1', name: 'Olaya', phone: null }]);
    const without = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );
    await waitFor(() => expect(mockApi.delivery).toHaveBeenCalled());
    expect(without.queryByText(/Call/)).toBeNull();
  });

  /**
   * Calling the customer, unmasked (owner decision). The backend decides
   * *when* — it strips the number from the payload until pickup — so these
   * assert that this screen simply follows the payload rather than carrying a
   * second copy of the rule that could drift from it.
   */
  it('offers to ring the customer once the server has sent a number', async () => {
    mockApi.delivery.mockResolvedValue({
      ...DELIVERY,
      status: 'OUT_FOR_DELIVERY',
      customerName: 'Fatimah',
      customerPhone: '+966500000123',
    });

    const { findByText, getByLabelText } = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );

    expect(await findByText('📱 Call customer')).toBeTruthy();
    // Named in the spoken label: a driver using a screen reader at a door
    // should know who they are about to ring.
    expect(getByLabelText(/Call the customer, Fatimah/)).toBeTruthy();
  });

  it('shows no call button on a finished job, so past customers are not a directory', async () => {
    // Home lists past deliveries and each opens this screen. The server takes
    // the number back at DELIVERED, so this asserts the app follows that rather
    // than caching what it last saw.
    mockApi.delivery.mockResolvedValue({
      ...DELIVERY,
      status: 'DELIVERED',
      customerName: null,
      customerPhone: null,
    });

    const { queryByText } = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );

    await waitFor(() => expect(mockApi.delivery).toHaveBeenCalled());
    expect(queryByText('📱 Call customer')).toBeNull();
  });

  it('shows no call button at all before pickup, when the server sends none', async () => {
    // Not a disabled button and not a hidden one — there is nothing to call.
    // The number is absent from the payload, which is the whole point of the
    // server holding the gate.
    mockApi.delivery.mockResolvedValue({
      ...DELIVERY,
      status: 'ASSIGNED',
      customerName: null,
      customerPhone: null,
    });

    const { queryByText } = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );

    await waitFor(() => expect(mockApi.delivery).toHaveBeenCalled());
    expect(queryByText('📱 Call customer')).toBeNull();
  });

  it('names the customer at the door before a recipient has been captured', async () => {
    // `recipientName` is recorded *at* drop-off, so until then the customer's
    // own name is the only one there is — and it is what gets a driver past a
    // reception desk.
    mockApi.delivery.mockResolvedValue({
      ...DELIVERY,
      status: 'OUT_FOR_DELIVERY',
      recipientName: null,
      customerName: 'Fatimah',
      customerPhone: '+966500000123',
    });

    const { findByText } = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );

    expect(await findByText('Recipient: Fatimah')).toBeTruthy();
  });

  it('survives a backend that sends no customer fields at all', async () => {
    // An app on a driver's phone outlives the server it was built against.
    mockApi.delivery.mockResolvedValue({ ...DELIVERY, status: 'PICKED_UP' });

    const { queryByText } = wrap(
      <DeliveryDetailScreen navigation={navigation} route={{ key: 'k', name: 'DeliveryDetail', params: { id: 'd1' } } as never} />,
    );

    await waitFor(() => expect(mockApi.delivery).toHaveBeenCalled());
    expect(queryByText('📱 Call customer')).toBeNull();
  });

  it('renders a job with no address snapshot and no recipient', async () => {
    // Both are nullable in the API; neither may take the screen down.
    mockApi.delivery.mockResolvedValue({ ...DELIVERY, addressSnapshot: null, recipientName: null });
    const { getByText } = wrap(<DeliveryDetailScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
  });

  it('renders a job the API returned without a reference', async () => {
    mockApi.delivery.mockResolvedValue({
      ...DELIVERY,
      order: { ...DELIVERY.order, referenceId: undefined },
    });
    const { getByText } = wrap(<DeliveryDetailScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText('1000000')).toBeTruthy());
  });

  it('shows the cash to collect on a COD job', async () => {
    mockApi.delivery.mockResolvedValue({ ...DELIVERY, isCashOnDelivery: true, amountDueMinor: 11_500 });
    const { getByText } = wrap(<DeliveryDetailScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getByText(/115\.00/)).toBeTruthy());
  });
});

describe('HistoryScreen', () => {
  const route = { key: 'k', name: 'History' } as never;

  it('renders completed and failed deliveries', async () => {
    // The screen asks for DELIVERED and FAILED separately, so both lists are
    // populated here and the order number legitimately appears twice.
    mockApi.deliveries.mockImplementation((status?: string) =>
      Promise.resolve({
        data: [
          {
            ...DELIVERY,
            status: status === 'FAILED' ? 'FAILED' : 'DELIVERED',
            deliveredAt: status === 'FAILED' ? null : '2026-09-01T11:00:00.000Z',
            failedAt: status === 'FAILED' ? '2026-09-01T11:00:00.000Z' : null,
            failureReason: status === 'FAILED' ? 'Nobody home' : null,
          },
        ],
      }),
    );
    const { getAllByText, getByText } = wrap(<HistoryScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(getAllByText('1000000').length).toBeGreaterThan(0));
    // The screen summarises failures as a count rather than listing reasons.
    expect(getByText('Failed')).toBeTruthy();
  });

  it('renders an empty history', async () => {
    mockApi.deliveries.mockResolvedValue({ data: [] });
    expect(() => wrap(<HistoryScreen navigation={navigation} route={route} />).unmount()).not.toThrow();
  });
});
