import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

import { Api } from '../api/endpoints';
import { PING_INTERVAL_MS, sharesLocation } from '../delivery/location-sharing';
import { DeliveryStatus } from '../types/backend';

/**
 * Sends the driver's position while they are carrying an order, so the customer
 * tracking their order can see it move.
 *
 * Everything downstream of this already existed — the backend stores the ping
 * and hands it to the customer's tracking screen, which polls for it — and
 * **nothing ever sent one**. The driver app read GPS only to build a navigation
 * link and to stamp a drop-off. So the customer's map had a destination pin, no
 * driver on it, and no way to ever get one.
 *
 * Three things it deliberately does not do:
 *
 * - **No background tracking.** It runs while the delivery screen is open, and
 *   `expo-location`'s foreground API is all it asks for. Following a courier
 *   around when the app is closed is a different permission, a different
 *   privacy conversation, and a battery cost nobody agreed to.
 * - **No permission prompt of its own.** If location was never granted it sends
 *   nothing and says nothing: the screen has already asked once, for the
 *   navigation link, and a driver holding a bag of food should not meet a
 *   dialog every thirty seconds.
 * - **No error surfaced.** A failed ping is not the driver's problem to solve
 *   and must never interrupt the delivery; the next one is thirty seconds away.
 *   It is best-effort in exactly the sense the notification dispatcher is.
 */
export function useLocationSharing(api: Api, status: DeliveryStatus | null | undefined): void {
  const active = sharesLocation(status);
  // Held in a ref so a slow request cannot overlap the next tick, and so the
  // interval identity does not change when a send is in flight.
  const sending = useRef(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const send = async (): Promise<void> => {
      if (sending.current) {
        return;
      }
      sending.current = true;
      try {
        const { status: permission } = await Location.getForegroundPermissionsAsync();
        if (permission !== 'granted' || cancelled) {
          return;
        }
        // Balanced, not BestForNavigation: this shows a customer which street
        // their food is on. Street-level is the requirement, and the cheaper
        // accuracy is meaningfully kinder to the battery over a long shift.
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) {
          return;
        }
        await api.updateLocation(position.coords.latitude, position.coords.longitude);
      } catch {
        // Best-effort by design — see the note above.
      } finally {
        sending.current = false;
      }
    };

    // Send one immediately: a customer who opens tracking the moment the driver
    // leaves should not wait out a whole interval for the first fix.
    void send();
    const timer = setInterval(() => void send(), PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, api]);
}
