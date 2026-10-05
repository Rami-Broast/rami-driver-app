# driver-app

Rami Broast delivery driver app — **React Native (Expo)**.

Sign in, go online, receive delivery assignments, navigate with Google Maps,
and move each job through pickup → out for delivery → delivered (or report a
problem). Talks only to the [backend](https://github.com/Rami-Broast/backend)
API. Shares the platform Motion & Animation Design System and brand with the
other apps.

## Quick start

```bash
npm install
npm start            # Expo dev server
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # pure-logic tests (delivery flow, money, http)
npm run test:components
```

## What it does

- **Login** — staff email + password (a driver is a staff user with the DRIVER
  role).
- **Home** — an online/offline shift switch; while online the app reports the
  driver's location to the backend on an interval so customers and staff can
  track the delivery live. Active jobs and other assignments are listed.
- **Delivery detail** — a Google map of the drop-off, a Navigate button that
  hands off to the phone's maps app, and the one next action for the delivery's
  current state (pickup → out for delivery → delivered), plus "report a problem"
  after pickup.

## Delivery flow is pure and tested

The driver's next action per delivery status lives in
`src/delivery/delivery-flow.ts` — a pure, unit-tested function mirroring the
backend delivery state machine (a delivery can only be reported failed after
pickup). Screens read it; they never hard-code the transition rules.

## Maps

`src/maps/AppMap.tsx` wraps `react-native-maps`. Google provider on Android
(needs a key in `app.json → android.config.googleMaps.apiKey`), Apple map
fallback on iOS when no key is set. **No key is committed** — supply one per
environment.

## Stack

Expo SDK 51 · React Native 0.74 · Reanimated 3 · react-native-maps ·
expo-location · React Navigation · TypeScript.
