# Mobile App — Local Development Setup

This guide walks you through running the **flightdad iPhone app** on your
machine — either in the built-in iOS Simulator or on a physical iPhone — and
wiring it up to the local backend server.

No prior mobile development experience is required.

---

## Table of contents

1. [How the pieces fit together](#how-the-pieces-fit-together)
2. [Prerequisites](#prerequisites)
3. [Install dependencies](#install-dependencies)
4. [Start the backend](#start-the-backend)
5. [Configure the API URL](#configure-the-api-url)
6. [Run in the iOS Simulator](#run-in-the-ios-simulator)
7. [Run on a physical iPhone](#run-on-a-physical-iphone)
8. [Making code changes](#making-code-changes)
9. [Troubleshooting](#troubleshooting)

---

## How the pieces fit together

```
┌─────────────────────────┐          ┌──────────────────────────────┐
│  iPhone / iOS Simulator  │  HTTP    │  flightdad backend           │
│  (apps/mobile)           │ ───────► │  (services/backend)          │
│                          │          │  http://localhost:3000        │
└─────────────────────────┘          └──────────────────────────────┘
```

- The **mobile app** is a React Native app powered by [Expo](https://expo.dev).
  Expo handles bundling, hot-reload, and the bridge to native iOS APIs — you do
  **not** need to write any Swift or Objective-C.
- The **Expo Go** app (or a development build) runs on the phone/simulator and
  connects back to your laptop over the network to load the JavaScript bundle.
- The **backend** is a Node.js / Express server running locally on your laptop.
  The app calls it over HTTP using the URL you configure below.

---

## Prerequisites

### 1 — macOS

iOS development requires macOS. Linux and Windows are not supported for running
the iOS Simulator.

### 2 — Xcode

Xcode provides the iOS Simulator and the native toolchain.

1. Install **Xcode** from the [Mac App Store](https://apps.apple.com/app/xcode/id497799835).
   This is a large download (~10 GB) — start it early.
2. Open Xcode once after installing. Accept the license agreement and let it
   finish installing additional components.
3. Install the **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
4. Verify the simulator runtime is installed. In Xcode:
   `Xcode → Settings → Platforms` — ensure an **iOS** platform is listed.
   If not, click **+** and download the latest iOS simulator.

### 3 — Node.js ≥ 18 and npm ≥ 9

```bash
node --version   # should print v18.x or higher
npm --version    # should print 9.x or higher
```

Download from [nodejs.org](https://nodejs.org) if needed, or use a version
manager such as [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 20
nvm use 20
```

### 4 — Expo CLI

```bash
npm install --global expo-cli
```

Verify: `expo --version`

---

## Install dependencies

From the **repository root** (not inside `apps/mobile`), run:

```bash
npm install
```

This installs dependencies for every workspace in one step — the mobile app,
the backend, and the shared package are all set up together.

---

## Start the backend

The mobile app talks to the backend over HTTP. Start it before launching the
app.

**Option A — Docker (recommended)**

```bash
# From the repository root
docker compose up --build
```

The backend is now reachable at `http://localhost:3000`.

**Option B — Node.js directly**

```bash
# From the repository root
npm run backend
```

This is equivalent to `cd services/backend && npm run dev`.

Verify it is running:

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

See the main [README](../README.md) for more backend configuration options.

---

## Configure the API URL

The app reads the backend URL from an environment variable called
`EXPO_PUBLIC_API_URL`. The value you set depends on whether you are running
in the iOS Simulator or on a physical iPhone.

### For the iOS Simulator

The simulator runs on your Mac and shares its loopback address, so
`localhost` works directly.

```bash
# In apps/mobile/
cp .env.example .env.local
# Leave EXPO_PUBLIC_API_URL=http://localhost:3000 as-is
```

### For a physical iPhone

Your phone is a separate device on the Wi-Fi network and cannot reach
`localhost` on your laptop. Use your Mac's local IP address instead.

1. Find your Mac's LAN IP:
   ```bash
   ipconfig getifaddr en0
   # example output: 192.168.1.42
   ```
   > If `en0` returns nothing try `en1` (Wi-Fi adapter name varies by Mac model).
   > Or open **System Settings → Wi-Fi → Details** and read the IP Address field.

2. Create the env file and set the IP:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```
   Then edit `apps/mobile/.env.local` and update the line:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.42:3000
   ```
   Replace `192.168.1.42` with the IP you found above.

3. Make sure both your laptop and your iPhone are on the **same Wi-Fi network**.

> **Note:** `EXPO_PUBLIC_` is a special prefix that Expo uses to expose
> environment variables to the JavaScript bundle at build time. Other env vars
> are not available in the app.

---

## Run in the iOS Simulator

```bash
# From the repository root
npm run mobile
```

This starts the **Expo development server** (Metro bundler). After a few
seconds you will see a QR code and a menu in your terminal:

```
› Metro waiting on exp://192.168.1.42:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press i │ open iOS simulator
› Press a │ open Android
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

Press **`i`** to open the app in the iOS Simulator. The first launch
downloads and builds the JavaScript bundle — this takes ~30 seconds. Subsequent
launches are much faster thanks to the Metro cache.

The app will display the flightdad home screen inside a simulated iPhone window
on your desktop.

### Choosing a different simulator device

By default Expo picks the most recently used simulator. To target a specific
device, use Expo CLI directly:

```bash
cd apps/mobile
expo start --ios --simulator "iPhone 15 Pro"
```

List available simulators:
```bash
xcrun simctl list devices available
```

---

## Run on a physical iPhone

### Step 1 — Install Expo Go

Install the free **Expo Go** app on your iPhone from the
[App Store](https://apps.apple.com/app/expo-go/id982107779).

### Step 2 — Start the dev server

```bash
# From the repository root
npm run mobile
```

### Step 3 — Connect your phone

Open the **Camera** app on your iPhone and point it at the QR code printed
in the terminal. Tap the banner that appears — Expo Go opens and loads your app
over the network.

> Both your laptop and your iPhone must be on the **same Wi-Fi network**.

### Step 4 — Verify the backend connection

With `EXPO_PUBLIC_API_URL` set to your laptop's LAN IP (see
[Configure the API URL](#configure-the-api-url)), the app will reach the
backend running on your laptop.

---

## Making code changes

The Expo development server supports **Fast Refresh** — edits you make to any
`.tsx` or `.ts` file in `apps/mobile/` are reflected on the simulator or
phone within a second or two, without restarting anything.

- **Edit a screen** → `apps/mobile/src/screens/<ScreenName>.tsx`
- **Edit navigation** → `apps/mobile/src/navigation/AppNavigator.tsx`
- **Edit the API client** → `apps/mobile/src/services/apiClient.ts`
- **Change the entry component** → `apps/mobile/App.tsx`

To force a full reload press **`r`** in the terminal running the Expo server, or
shake the phone to open the developer menu.

---

## Troubleshooting

### `Unable to find expo in this project` or `command not found: expo`

Expo CLI is not installed globally. Run:

```bash
npm install --global expo-cli
```

### Simulator does not open / `No simulator found`

1. Confirm Xcode is installed and has been opened at least once.
2. Confirm an iOS platform is installed: `Xcode → Settings → Platforms`.
3. Try opening a simulator manually: `open -a Simulator`.
4. Restart the Expo server after opening the Simulator.

### App shows a blank screen or "Network request failed"

The app cannot reach the backend. Check:

- Is the backend running? `curl http://localhost:3000/health` should return `{"status":"ok"}`.
- Are you on a physical device? If so, make sure `EXPO_PUBLIC_API_URL` in
  `apps/mobile/.env.local` uses your Mac's LAN IP, **not** `localhost`.
- Are both devices on the same Wi-Fi network?
- Is your firewall blocking port 3000? Try:
  ```bash
  # macOS — allow incoming connections for Node.js:
  # System Settings → Network → Firewall → Options → click "+"
  # → add the Node.js executable (e.g. /usr/local/bin/node or the output of
  #   "which node") → set it to "Allow incoming connections"
  ```

### `Metro bundler` port already in use

Another process is using port 8081. Either kill it or start Metro on a
different port:

```bash
cd apps/mobile
expo start --port 8082
```

### Changes not reflecting on the device

Press **`r`** in the Expo terminal to force a reload. If that does not work,
shake the phone and tap **Reload** in the developer menu.

### TypeScript errors in the editor

Run the TypeScript checker to see all type errors:

```bash
cd apps/mobile
npm run lint      # runs: tsc --noEmit
```

---

## Next steps

Functional screens (flight status, check-in, notifications) will be added in
later issues. Once the backend endpoints are implemented you will be able to
exercise the full flow end-to-end using the setup described in this guide.
