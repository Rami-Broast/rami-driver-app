# driver-app — project context

Expo React Native delivery-driver app.

## Client-demo decisions (locked)

**Read `../backend/DEMO_DECISIONS.md` before touching maps, push or POD.**

- **We are showing this to the client. Approval unlocks real credentials.**
- **Push notifications** — mock until approval; poll for now.
- **Google Maps keys are needed *now*** — active-delivery navigation and
  location pings need the Android + iOS map keys. Set them in `app.json`
  before the demo.
- **Cash on delivery** flows through this app (per-branch opt-in). The driver
  view now surfaces `isCashOnDelivery` + `amountDueMinor` (from the backend —
  the app never computes it), shows "Collect SAR X" on a COD delivery, and after
  drop-off records the collected amount via
  `POST /driver/deliveries/:id/cash-collected`. The backend copies the expected
  amount and computes the variance server-side; the app only reports what was
  physically collected. One record per delivery, immutable.
- **No invoice screen** — restaurant issues its own ZATCA invoice separately.

## A job arrives; it does not turn up

`src/realtime/RealtimeProvider.tsx` holds one authenticated socket for the
signed-in driver, and `HomeScreen` reloads on `delivery.assigned` /
`delivery.unassigned`.

Until this, a driver learned about a job from the Home screen's eight-second
poll **and nothing else** — push is still mocked — and only while that screen
was open. So "the counter assigned it" and "the driver knows" were up to eight
seconds and a screen-state apart, with the food already on the pass.

The backend side needed a change too, and it is worth knowing why: a driver is
a **staff** actor with `branchScope: NONE`, so the gateway's branch logic put
their socket in no room at all. It now joins `driver:<userId>` for any socket
holding `deliveries:own` — the DRIVER role's only permission.

Four things to keep:

- **The poll stays**, as the floor. A courier's phone moves between cells,
  loses signal in a basement car park and sleeps in a pocket. `useRealtimeReload`
  also fires once on every reconnect, so a job assigned while the phone was in a
  lift lands the moment signal returns.
- **The socket is not gated on `online`, unlike the poll.** The poll's gate is a
  battery decision about a timer; this is one already-open socket, and gating it
  would make a driver assigned a job just before their profile loaded wait out
  the full interval.
- **`useRealtime` deliberately does not throw** without a provider. A screen
  with no socket still polls, and the alternative is a missing provider turning
  into a blank view on a phone someone is holding at a door — which is the
  failure `App.tsx`'s boundary exists for. The screen tests mount without it.
- **`delivery.unassigned` matters as much as the assignment.** A job taken back
  at the counter has to leave the list, or a driver sets off for a pickup
  somebody else is already doing.

The **NEW** badge reads `assignedAt` rather than tracking arrivals in state, so
it is right after a reconnect, a relaunch, or a phone taken out of a pocket —
the three cases where "did that arrive while I was watching?" is exactly what a
driver cannot tell.

## A driver carries a run, not a job

The backend now lets a counter stack a second (or third) drop onto a driver
already out — batching drops onto one run is how a small fleet actually works,
and refusing it left food on the pass whenever everybody happened to be busy.
That turns Home from a list into a **run**, and `src/delivery/run.ts` (pure,
tested) is the whole of it:

- **Everything still at a branch comes before everything already in the bag.**
  Food on a pass is going cold and the branch cannot clear its counter; an order
  already collected is travelling with the driver either way. Within each group,
  oldest first — the customer who has waited longest.
- **It is a suggestion and the app never enforces it.** A driver can see the
  road; a sort function cannot, and a list that will not let someone deliver the
  flat they are standing outside is worse than no ordering at all. Every card
  stays tappable.
- **The summary says what is in each leg** — "2 to collect · 1 to deliver".
  "3 jobs" is the line that makes a driver open all three.
- Cards are **numbered only when there is more than one**, so a single job does
  not read as the first of a list that does not exist, and each says `Collect ·`
  or `Deliver to ·` because that is the only word changing where the driver
  goes next.

## Taking a break

The switch under the shift toggle, and it is newly meaningful. `isAvailable`
used to fall out of holding a job; now that a busy driver is assignable, it is
the driver's own *"don't give me anything for a bit"* — and the backend reads
the active-job count precisely so that **a break and a full bag stay different
things**. Without this switch the only way to stop the flow was going offline,
which also hides the jobs already in hand.

It appears **only between jobs**, because the backend refuses a break outright
while a driver holds work. A switch that will be refused is worse than no
switch. A failed toggle simply does not move: the server is the truth, the next
poll restores it, and a driver on a doorstep does not need a dialog.

## Today, without inventing a wage

The Home card shows drops delivered, failures, and **cash held** — and
deliberately no earnings figure, for the same reason `HistoryScreen` shows none:
the platform has no driver-pay model, so a number called "earned" would be
fabricated, and a driver who plans around a fabricated number finds out at the
end of the month. Cash held is the figure that actually matters at the end of a
shift, because somebody has to be handed it.

`src/delivery/shift-summary.ts` is pure and takes `now` as an argument. "Today"
is a **local-day** boundary, and a function that reads the clock cannot be
tested at 23:55 — which is exactly when a day-boundary bug shows and nobody is
looking. Cash on a *failed* drop still counts: it is money in the driver's
pocket either way.

## Calling the customer, and calling the branch

Delivery detail carries **both**, and the order they sit in is the order a
driver reaches for them: the customer first, the branch as the fallback for
when nobody answers.

**The customer's number is real and unmasked** (owner decision). This platform
used to withhold it entirely — no call-masking provider is contracted, so the
safe default had been to give a driver nothing — and the cost of that default
was a driver at an unmarked gate with a cooling bag and no way to reach anyone.

**The server decides when, not this app.** The number is in the payload for
exactly the two statuses a delivery is live in — `PICKED_UP` and
`OUT_FOR_DELIVERY` — and absent before and after. So the button appears exactly
when there is something to call, and this screen never carries a second copy of
a rule that could drift from the backend's. A null here means the server
withheld it, not that the screen chose not to show it.

**The "after" half of that is the one that matters here**, and it is a
constraint this app imposed on the backend rather than the other way round:
Home lists finished jobs under **OTHER** and every one of those rows opens this
screen. A number that survived the drop would therefore not have meant a few
minutes of grace — it would have meant every customer a driver had ever
delivered to staying one tap from being dialled, for as long as the app was
installed. See `backend/src/delivery/customer-contact.ts`, which says the same
thing from the other side.

`customerName` fills the Recipient line before a drop-off has captured one:
`recipientName` is recorded *at* the door, so until then the customer's own
name is the only one there is — and "ask for Fatimah" is how a driver gets past
a reception desk.

**The branch number** comes from the same public `/customer/branches` list the
customer app reads. It is a published business contact already printed on every
docket. Two things it keeps: the request is `public`, so it loads even mid
token refresh (a driver reaching for the phone is the worst moment to meet a
sign-in screen), and it **fails to `[]`** — a branch list that will not load
costs the Call button and nothing else. A branch that has published no number
gets no button, because one that dials nothing is worse than its absence and
the driver only finds out which at the moment they need it.

## Navigation goes to Google Maps, and the map is the button

`src/util/navigationUrl.ts` builds the link. **Google Maps on every platform**,
not Apple Maps on iOS — and not only because the owner asked. The customer
dropped their pin in a Google map inside the customer app, so the coordinates
were chosen against Google's view of the world; opening them in another
provider can put the driver on the wrong side of a compound wall in exactly the
places an address is hardest to find.

Android gets `google.navigation:`, which starts turn-by-turn immediately — a
driver holding a bag of food should not also have to press "Start". iOS gets
the universal `https://www.google.com/maps` URL rather than `comgoogleapps://`,
which would fail silently when Google Maps is not installed; the https URL
opens the app when it is there and the browser when it is not.

**The whole map is tappable**, not just the text link. A driver at a door,
one-handed, aims at the biggest thing on screen. The written address is
tappable too, and the link remains for anyone who reads before tapping.

`hasPin` rejects `0,0` — the Atlantic, which is what a dropped default looks
like and never a Saudi delivery address. Sending a driver there is worse than
telling them there is no pin, so the screen says so and shows the written
address instead.

The helper takes the platform as an argument rather than importing `Platform`,
which keeps it out of the React Native module graph and inside the fast logic
suite. A navigation link that silently opens the wrong place is not something a
render test would ever catch.

## Proof of delivery

`ProofOfDeliveryScreen` captures the drop-off proof, then marks delivered.
`NONE` needs no capture; `PHOTO` uses `expo-image-picker`; `SIGNATURE` uses the
dependency-free SVG pad in `components/SignaturePad.tsx`. `SIGNATURE`/`PHOTO`
require a URL, which comes from the **proof-upload port**
(`src/proof/proof-upload.ts`). No object storage is provisioned yet (blocked on
infra, same category as SMS/maps/push), so that port is a **mock** behind a
stable interface — it returns a clearly-marked `mock://proof/...` URL and
persists nothing. Swapping in the real uploader (signed-URL PUT, etc.) is a
one-file change. `OTP` proof is intentionally not offered — no challenge flow
exists (see the backend `src/delivery/README.md`).

## History

`HistoryScreen` shows completed + failed deliveries and the COD cash handled.
It deliberately shows **no monetary "earnings"**: the platform has no
driver-pay model — per-delivery pay/commission is an unset business input the
backend does not hold, so an earnings figure would be fabricated. Layer one on
here once a payout model exists in the backend.

## White screens

`App.tsx` wraps everything in `<ErrorBoundary>` (`src/components/`), **outside
every provider** — React unmounts the whole tree on an uncaught render error,
and on a release build that is a blank view a driver can only escape by
force-quitting, mid-delivery. The fallback shows no stack trace: a driver
hitting it is standing at a door with a bag of food, so it says the active
delivery is unaffected and offers Try again. Colours are hard-coded because the
theme provider is one of the things that can throw.

## Screens are mounted in tests

**The stub is built from `Api.prototype`, not hand-listed** (same as the admin
app's harness). A hand-written stub goes stale the moment a screen calls
something new, and it fails as `api.newThing is not a function` *inside render*
— which is the blank screen this suite exists to catch, reported as a failure
with no obvious link to the change that caused it. Adding `api.branches()` broke
four tests exactly that way before the stub was rebuilt this way.

`test/components/screens.spec.tsx` mounts every screen against a stubbed API,
because a render error is what produces a blank view and neither the pure tests
nor the backend contract suites catch one. The fixtures are deliberately
awkward — no address snapshot, no recipient name, a job with no reference, an
empty history — since a screen that only renders against tidy data is not
actually known to work. Add a case here when a screen starts reading a new
nullable field.

## A failed request must not blame the driver's signal

`networkErrorMessage` (`src/api/http.ts`, pure and tested). Every `fetch` throw
used to become **"No connection. Check your network and try again."** — a
sentence that is right about a fifth of the time. `fetch` throws the same opaque
`TypeError` for a lost signal, a DNS failure, a TLS failure, a server that is
down, and — on the **web** build, which is how this app is deployed to Vercel —
**a request the API's CORS allow-list refused**. Browsers deliberately hide the
CORS reason from JavaScript, so the app cannot read the cause off the error.

What it *can* read is `navigator.onLine`. If the device has a network and the
request still failed, this is our problem and the message says so, rather than
sending a driver to check a connection that is working. A timeout is named as a
timeout, which is a retry rather than a diagnosis. `null` (a native build, where
there is no `navigator`) keeps the cautious wording.

**If sign-in fails on the Vercel build, check the CORS allow-list first.** The
API's `CORS_ALLOWED_ORIGINS` comes from the `CLIENT_ORIGINS` repo variable, and
an origin that is not in it has every request rejected before it reaches a
route. This app's origin *was* left out — the list deployed on 2026-09-06 named
the admin, POS and customer origins and localhost but not
`https://driver-app-orpin.vercel.app`, so no driver could sign in on the web
build and the banner above is exactly what they saw.

All four origins are now written out in full in
`infrastructure/docs/client-origins-and-cors.md`, and the backend's demo deploy
ends with a step that preflights every origin in the variable and fails if one
is refused. That step cannot catch an origin nobody added, so the doc's table
is still the thing to update when a client or a custom domain appears.

## Location policy — now actually implemented

Only ping during an active delivery (from PICKED_UP onward). Idle online
drivers do not stream location, per spec §24.

That was the written policy and **nothing implemented it**: this app read GPS
only to build a navigation link and to stamp a drop-off, so the customer's
tracking map had a destination pin, no driver on it, and no way to ever get one
— even though the backend stored pings and the customer app polled for them.

`delivery/location-sharing.ts` (pure, tested) decides *whether*;
`hooks/useLocationSharing.ts` does it, from the delivery screen. Three
deliberate limits:

- **Foreground only.** It runs while the delivery screen is open. Following a
  courier with the app closed is a different permission, a different privacy
  conversation and a battery cost nobody agreed to.
- **It never prompts.** No permission means no ping and no dialog — the screen
  already asked once, for navigation, and a driver at a door should not meet a
  prompt every thirty seconds.
- **A failed ping is silent.** Best-effort, like the backend's notification
  dispatch: the next one is thirty seconds away and it is not the driver's
  problem to solve mid-delivery.

**30 seconds, and the interval is not a cost decision.** A ping is a small write
to our own server. Google bills for *maps* and for *route drawing*, neither of
which a ping touches — so slowing pings down saves nothing and makes the
customer's marker look frozen, which is what makes them ring the branch.

## Release configuration (EAS)

`eas.json` is committed, with `development` / `preview` / `production`
profiles — **do not run `eas build:configure`**, it overwrites them. Each
profile sets `API_BASE_URL`; `app.config.js` injects it, along with
`GOOGLE_MAPS_API_KEY`, which comes from an EAS secret and is never committed.

`cli.appVersionSource` is `remote` and `production` sets `autoIncrement: true`,
so EAS owns the build number. `app.json`'s `version` (`1.0.0`, previously
`0.1.0` while `package.json` already said `1.0.0`), `ios.buildNumber` and
`android.versionCode` are the seed values for the first production build.

**The icon is a stopgap** — see `assets/README.md`. `logo.jpeg` is a 1600 × 384
JPEG and was serving as icon, splash, adaptive foreground and favicon, which
App Store Connect rejects outright. Generated PNGs replace it in those four
slots; the wordmark stays on the launch and sign-in screens where it belongs.

`ios.supportsTablet` is now `false` — no iPad screenshots exist, and Apple
checks.

**This app probably should not be published to the public App Store.** There is
no public sign-up: drivers are created in the admin panel and handed
credentials, which is what Guideline 4.2 rejects. Apple Business Manager custom
apps, or TestFlight for the pilot, are the routes — see
`infrastructure/docs/app-store-release-readiness.md` § B11.

## Expo SDK 57, and the New Architecture

Upgraded from SDK 51 (RN 0.74.5) to **SDK 57 / RN 0.86.3 / React 19.2**, in step
with `customer-app` — Google Play has required **API level 36** for new apps and
updates since **31 August 2026**, and SDK 51 targets API 34. The two apps are
upgraded together on purpose: they share patterns, and letting their SDKs
diverge makes every later change twice the work.

**This app now runs on the New Architecture and cannot run on the old one.** RN
0.82 removed the legacy architecture; SDK 55 dropped `newArchEnabled` from
`app.json`, which is why the key is gone from ours. Maps, location and the image
picker all go through Fabric and TurboModules now. **Nothing here proves that
works on a handset** — the tests, the typecheck and the web bundle are all still
true of an app that crashes on launch, and a driver meeting that mid-shift is
the failure this repo spends most of its care avoiding.

Three changes worth knowing about:

- **Reanimated 4 sits on `react-native-worklets`.** `babel.config.js` names
  `react-native-worklets/plugin` directly; `jest.config.js` needs
  `resolver: 'react-native-worklets/jest/resolver'`, without which the official
  Reanimated mock cannot be imported at all.
- **`react-native-maps` 1.27 resolves its TurboModule at import time**, so
  importing `DeliveryDetailScreen` throws under jest. `test/setup.ts` mocks it
  as a plain view — these tests prove a screen mounts, and a real map cannot
  render in that environment anyway.
- **The polling test needed a promise flush, not a weaker assertion.** The
  Home poll only starts once `api.me()` reports the driver online, so under
  React 19 the clock was being advanced past the interval before the interval
  existed. One `await act(async () => {})` fixes it; the assertion still fails
  if the poll is removed, which was checked by removing it.

Device testing is the gate: `eas build --profile preview` on a real iPhone and a
real mid-range Android, walking an assigned delivery through pickup,
navigation, proof of delivery and cash collection, before anything is submitted.
