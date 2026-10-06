import { ProofType } from '../types/backend';
import { ApiClient } from './http';
import { AuthTokens, Branch, CashCollection, Delivery, DriverProfile } from './types';

export interface LocationInput {
  latitude?: number;
  longitude?: number;
  notes?: string;
}

/** Typed backend endpoints the driver app uses. */
export class Api {
  constructor(private readonly http: ApiClient) {}

  // Auth (staff — the driver is a staff user with the DRIVER role)
  login(email: string, password: string): Promise<AuthTokens> {
    return this.http.request('/auth/staff/login', { method: 'POST', body: { email, password }, public: true });
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.http.request('/auth/refresh', { method: 'POST', body: { refreshToken }, public: true });
  }

  /**
   * Ends the session server-side.
   *
   * Clearing the token locally is not signing out: the refresh token stays
   * valid for its full 30 days, so a shared terminal or a lost device keeps a
   * working session. This revokes the family. Callers clear local state
   * regardless of the result — signing out must never fail because the network
   * did.
   */
  logout(refreshToken: string): Promise<void> {
    return this.http.request('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      public: true,
    });
  }

  /**
   * The branches, from the same public list the customer app reads.
   *
   * A driver needs the branch's phone number: a pickup that is not ready, a
   * building with no obvious entrance, an address that turns out to be wrong.
   * Until now the only number in this app was nobody's — the customer's is
   * deliberately never exposed to a driver (no call-masking provider is
   * contracted), so a driver stuck at a door had no one to ring from inside the
   * app at all.
   *
   * The branch's own number is a published business contact already printed on
   * every docket, so there is nothing new being disclosed here. Public, so it
   * loads even if the token is mid-refresh — a driver reaching for the phone is
   * the worst moment to meet a sign-in screen.
   */
  branches(): Promise<Branch[]> {
    return this.http.request('/customer/branches', { public: true });
  }

  // Own profile & shift
  me(): Promise<DriverProfile> {
    return this.http.request('/driver/me');
  }

  setOnline(isOnline: boolean): Promise<DriverProfile> {
    return this.http.request('/driver/me/status', { method: 'PATCH', body: { isOnline } });
  }

  setAvailability(isAvailable: boolean): Promise<DriverProfile> {
    return this.http.request('/driver/me/availability', { method: 'PATCH', body: { isAvailable } });
  }

  updateLocation(latitude: number, longitude: number): Promise<DriverProfile> {
    return this.http.request('/driver/me/location', { method: 'PATCH', body: { latitude, longitude } });
  }

  // Deliveries
  deliveries(status?: string): Promise<{ data: Delivery[] }> {
    return this.http.request(`/driver/deliveries${status ? `?status=${status}` : ''}`);
  }

  delivery(id: string): Promise<Delivery> {
    return this.http.request(`/driver/deliveries/${id}`);
  }

  markPickedUp(id: string, loc: LocationInput = {}): Promise<Delivery> {
    return this.http.request(`/driver/deliveries/${id}/picked-up`, { method: 'POST', body: loc });
  }

  markOutForDelivery(id: string, loc: LocationInput = {}): Promise<Delivery> {
    return this.http.request(`/driver/deliveries/${id}/out-for-delivery`, { method: 'POST', body: loc });
  }

  markDelivered(
    id: string,
    body: { proofType: ProofType; proofUrl?: string; recipientName?: string; latitude?: number; longitude?: number },
  ): Promise<Delivery> {
    return this.http.request(`/driver/deliveries/${id}/delivered`, { method: 'POST', body });
  }

  markFailed(id: string, reason: string): Promise<Delivery> {
    return this.http.request(`/driver/deliveries/${id}/failed`, { method: 'POST', body: { reason } });
  }

  /**
   * Records the cash collected for a COD delivery. The backend copies the
   * expected amount from the order and computes the variance server-side — the
   * app only reports what was physically collected (plus an optional note).
   */
  recordCashCollected(id: string, body: { collectedMinor: number; note?: string }): Promise<CashCollection> {
    return this.http.request(`/driver/deliveries/${id}/cash-collected`, { method: 'POST', body });
  }
}
