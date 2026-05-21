# PolicyOffice Mobile

Native iOS & Android client for the PolicyOffice SaaS, built with [Expo](https://expo.dev) + React Native + TypeScript. Pairs with the existing FastAPI backend at `insurance-agent-saas` and shares the same auth/data model used by the web app at `insurance-agent-saas-frontend`.

## What's inside

- **Six screens via Expo Router file-based routing**:
  - `app/login.tsx` — email/password sign-in (`POST /auth/login`), token stored in `expo-secure-store`
  - `app/(tabs)/index.tsx` — **Dashboard** with KPI cards, renewal buckets, upcoming renewals & birthdays
  - `app/(tabs)/renewals.tsx` — **Renewals** list with badges (Today, Tomorrow, Next 7 days, Overdue, This month, Later), search & filter chips
  - `app/renewals/[policyId].tsx` — Renewal detail with one-tap Call / WhatsApp / Email
  - `app/(tabs)/birthdays.tsx` — **Birthdays** with a bottom-sheet wish picker that opens WhatsApp deep-link, falls back to SMS, then clipboard
  - `app/(tabs)/documents.tsx` — **Documents** list (status badges, file size, customer)
  - `app/documents/[documentId].tsx` — Document viewer (inline image preview, iOS WebView PDF preview, Android pragmatic fallback) with **native share sheet via `expo-sharing`**
  - `app/(tabs)/analytics.tsx` — **Insights** with KPI cards, monthly renewals bar chart (custom SVG), portfolio mix, bucket snapshot
  - `app/(tabs)/profile.tsx` — Profile + sign-out

- **Reusable UI primitives** (`src/components/`): `Card`, `Badge`, `RenewalBadge`, `BirthdayBadge`, `KpiCard`, `Skeleton`, `EmptyState`, `ErrorBanner`, `Button`, `Avatar`, `SectionHeader`, `PressableRow`, `ScreenContainer`, `MiniBarChart`

- **Tenant-aware API client** (`src/api/`): typed wrappers around `/auth`, `/customers`, `/policies`, `/documents`
- **Native signup foundation**: Google sign-in/signup posts the platform identity token to `POST /auth/google`; new users are routed through mobile agency onboarding (`POST /onboarding/agency`) and then land on the dashboard.

## Run it

```bash
# from this folder
npm install

# iOS (requires Xcode on macOS, or Expo Go on a physical device)
npm run ios

# Android (requires Android Studio + emulator, or Expo Go on a physical device)
npm run android

# Web (used for quick smoke testing only — production app targets iOS/Android)
npm run web

# Just open the dev menu / QR code
npm start

# Build a local standalone Android APK on Windows.
# This embeds the JS bundle into the APK, so it does not need Metro at runtime.
npm run apk:debug

# Build unsigned/debug-signed release-mode artifacts for local install checks.
npm run apk:release

# Faster rebuild after prebuild/native files already exist.
npm run apk:release:fast

# Build Play Store upload-key-signed artifacts.
# Requires release-signing/playstore-signing.properties on this machine.
# Upload the AAB from dist/play-store/. The build targets Android API 35.
npm run play:release

# Faster signed rebuild after prebuild/native files already exist.
npm run play:release:fast

# Fastest Play Console path: build only the release-signed AAB.
npm run play:aab

# Build a Metro-dependent development APK only when you are running `npm start`.
npm run apk:dev
```

If you don't have Xcode/Android Studio set up, install **Expo Go** on your phone, run `npm start`, and scan the QR code.

## Configuration

The mobile app reads the backend URL from, in priority order:

1. `EXPO_PUBLIC_API_BASE_URL` (set in `.env` or shell — `/api/v1` is appended automatically if omitted)
2. `extra.apiBaseUrl` in `app.json` (the committed default)
3. `https://api.policyoffice.in/api/v1` (final fallback)

Copy `.env.example` to `.env` to override locally:

```bash
cp .env.example .env
# edit .env and point EXPO_PUBLIC_API_BASE_URL at your backend
```

To test against the local backend instead of Railway, use your machine's LAN IP (not `localhost` — devices on the network must be able to reach it):

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8000/api/v1
```

### Google signup on Android and iOS

This app is registered with these native identifiers:

```text
Android package: com.policyoffice.mobile
iOS bundle ID:  com.policyoffice.mobile
URL schemes:    policyoffice, com.policyoffice.mobile
```

For Google signup/sign-in, create OAuth clients in the same Google/Firebase project used by the backend verifier.

Firebase/Google Console setup:

1. Enable Authentication -> Sign-in method -> Google.
2. Add an Android app/OAuth client with package `com.policyoffice.mobile`. An Android client for the old package `com.policypulse.mobile` will fail with Google `400 invalid_request`.
3. Add SHA-1/SHA-256 fingerprints for the Android build you will test. For local debug builds, run `gradlew.bat signingReport` after prebuild; for release builds, add the release upload-key fingerprint. If the app is installed from Play Console closed testing with Play App Signing enabled, also add the **Play App Signing certificate** SHA-1 from Play Console -> Setup -> App integrity.
4. In the Android OAuth client, open **Advanced settings** and enable **Custom URI scheme**. Google AuthSession redirects back through:

   ```text
   com.policyoffice.mobile:/oauthredirect
   ```

   If this setting is off, Google shows `Access blocked: project-491076784026's request is invalid` before the backend is called.
5. Add an iOS app with bundle ID `com.policyoffice.mobile`.
6. Copy the Web, Android, and iOS OAuth client IDs into the mobile app environment:

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web OAuth client id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<iOS OAuth client id for com.policyoffice.mobile>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<Android OAuth client id for com.policyoffice.mobile>
```

These `EXPO_PUBLIC_*` values are compiled into the native bundle, so rebuild and reinstall the APK/AAB after changing them.

For Android, register the debug or release SHA-1/SHA-256 fingerprint with the Android OAuth client. After native prebuild, you can inspect the local debug fingerprint with:

```bash
cd android
gradlew.bat signingReport
```

The Railway backend must also trust the same token audiences. Set either all platform-specific values:

```text
GOOGLE_CLIENT_ID=<web OAuth client id>
GOOGLE_ANDROID_CLIENT_ID=<Android OAuth client id>
GOOGLE_IOS_CLIENT_ID=<iOS OAuth client id>
```

or set a comma-separated allow-list:

```text
GOOGLE_CLIENT_IDS=<web OAuth client id>,<Android OAuth client id>,<iOS OAuth client id>
```

## Auth / session model

Mirrors the web app exactly:

- `POST /auth/login` returns `{ access_token, refresh_token, user }`
- `POST /auth/google` returns the same tokens plus onboarding flags
- New Google users with no tenant are routed to `/onboarding/agency`, which calls `POST /onboarding/agency` and starts the free plan
- Tokens are persisted in **`expo-secure-store`** (encrypted on-device storage) under the key `policyoffice.session.v1`
- On launch, the stored token is verified against `GET /auth/me`; expired tokens cause an automatic redirect to `/login`
- `POST /auth/logout` is called on sign-out, then local state is cleared regardless of network success
- Demo credentials are pre-filled on the login screen: `admin1@demoagt1.test` / `DemoPass123!`

Refresh-token rotation is **not yet wired** — sessions stay valid until the access token expires (currently 30 min). See the "API gaps" section below.

## APIs in use

Strict reuse of the existing backend — no schema changes:

| Screen | Endpoints called |
|---|---|
| Login | `POST /auth/login`, `POST /auth/google` |
| Agency signup | `POST /onboarding/agency` |
| Session boot | `GET /auth/me` |
| Sign-out | `POST /auth/logout` |
| Dashboard, Renewals, Birthdays, Analytics | `GET /customers?limit=1000`, `GET /policies?limit=1000` |
| Renewal detail | filtered client-side from same lists |
| Documents list | `GET /documents?limit=200` |
| Document preview | `GET /documents/{id}/preview` (Bearer token in `expo-file-system.downloadAsync`) |
| Document share | `GET /documents/{id}/download` then `expo-sharing.shareAsync` |

## Birthday wish flow

`src/lib/whatsapp.ts` implements a graceful chain of fallbacks:

1. Try the **WhatsApp app deep link** (`whatsapp://send?phone=…&text=…`). On Android this also requires the package to be queryable; the deep link itself works without explicit query declarations on Android 11+ for WhatsApp's published intents. On iOS, `whatsapp` is in the `LSApplicationQueriesSchemes` list in `app.json`.
2. If the app isn't installed, fall back to the **WhatsApp universal link** (`https://wa.me/…`) which opens the web client or prompts to install.
3. If neither WhatsApp path opens, try **SMS** (`sms:…?body=…`).
4. As a last resort, **copy to clipboard** via `expo-clipboard` and surface a confirmation toast.

Four wish templates are bundled in `src/lib/wishes.ts` (warm, short, formal, with-offer) — easy to extend.

## Document viewing

- **Images** (jpg/png/webp/gif/bmp/tiff): downloaded into the cache directory and rendered with React Native's `<Image>`
- **PDFs on iOS**: rendered inline with `react-native-webview` pointing at the local file
- **PDFs on Android**: WebView doesn't natively render `file://` PDFs reliably, so we show a clear "Tap Share to open in a PDF viewer" hint. Tapping Share invokes the OS share/Open-In sheet, which always works
- **Everything else** (xlsx, docx, csv, …): "Preview not available in-app — use Share" + the share sheet, which surfaces every installed viewer

In all cases the user can share via the native iOS/Android share sheet (`expo-sharing`), so the file can be opened in WhatsApp, Mail, Drive, or any installed viewer.

## Mock data?

**None.** Every screen renders only what the live API returns. Empty states are explicit and direct the user to the web app for data entry.

## Assumptions

1. The backend at `EXPO_PUBLIC_API_BASE_URL` is reachable from the device's network. On a real device hitting a local backend, replace `localhost` with the LAN IP.
2. New Google users without a tenant complete agency onboarding in the mobile app through `POST /onboarding/agency`; the backend starts the free plan.
3. Customers have `date_of_birth` set for birthdays to appear. The list is empty otherwise.
4. Policy "category" (Health / Car / Bike / Life / Other) is inferred from `policy_name` + `policy_extra_data` using a regex classifier (`src/lib/classify.ts`) because the policy response returns segment/type as UUIDs, not codes.
5. Renewal "Today / Tomorrow / Next 7 days / Overdue / This month / Later" is computed client-side from `policy.renewal_date`, identical to the web app's logic.
6. Document file size, status, and mime type are taken at face value from `DocumentRead`.

## What still needs backend or API support

1. **Refresh-token rotation** — current sessions silently 401 once the access token expires (30 min default). Mobile should call `POST /auth/refresh` automatically on 401, but the backend rotation behavior needs verification first.
2. **Server-aggregated dashboard stats** — all KPIs and buckets are computed client-side from the full customer/policy lists. Fine up to a few thousand records per tenant; past that we'd want `GET /dashboard/summary`.
3. **Push notifications** — birthdays/renewals today would be ideal as push reminders. Requires backend to manage Expo push tokens and a scheduled worker.
4. **PDF policy upload from mobile** - Excel onboarding upload is wired; policy PDF upload/extraction from the phone is still a logical next step.
5. **Google sign-in client IDs** — code is wired, but Firebase/Google client IDs and backend accepted audiences must be set per environment.
6. **Customer detail** — not yet implemented as a dedicated screen on mobile. Renewal detail covers the most-used context; a deeper customer screen is a logical next step.
7. **Pagination** — lists request `limit=1000`/`limit=200` and assume that's enough. Add `?cursor=` or `?page=` once tenants outgrow that.

## Folder layout

```
app/                          # Expo Router routes
  _layout.tsx                 # AuthProvider + safe-area + status bar
  index.tsx                   # Auth gate → tabs or /login
  login.tsx
  (tabs)/                     # Bottom-tab navigator
    _layout.tsx
    index.tsx                 # Dashboard
    renewals.tsx
    birthdays.tsx
    documents.tsx
    analytics.tsx
    profile.tsx
  renewals/[policyId].tsx     # Renewal detail
  documents/[documentId].tsx  # Document viewer + share

src/
  api/                        # Typed HTTP layer
    client.ts
    types.ts
    auth.ts
    customers.ts
    policies.ts
    documents.ts
  context/                    # AuthProvider + useAuth hook
    auth-context.ts
    AuthProvider.tsx
    useAuth.ts
  hooks/                      # Data hooks (customers, policies, documents)
  lib/                        # Pure helpers (dates, currency, classify, insights, whatsapp, wishes, files)
  theme/                      # Design tokens (colors, spacing, typography, shadows)
  components/                 # Reusable UI primitives
```

## Lint & types

```bash
npm run lint         # eslint with expo config
npm run typecheck    # tsc --noEmit
```

Both run in CI-friendly mode and exit non-zero on errors.

## Building for release

For full native builds (App Store / Play Store), use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

For internal testing on physical devices without store distribution, build a development client:

```bash
eas build --profile development --platform android
```

---

Built to pair cleanly with the existing PolicyOffice web frontend and FastAPI backend. The mobile codebase intentionally mirrors the web's data shapes and naming so a developer can move between the two without retraining their mental model.
