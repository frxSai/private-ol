# ClickMe

A one-screen iOS app with an ON/OFF button for the fake-location session on the PC.
It calls `toggle_server.py` (in the `geo` folder) over Tailscale at `http://100.91.102.69:8765`
(change `SERVER` in `App.tsx` if the PC's Tailscale IP changes).
Built with Expo (React Native) on Windows. No Mac and no paid Apple account needed.

On the PC, start the server (it asks for Administrator):

```bash
python toggle_server.py --host 100.99.251.106
```

Then tap the button in the app: ON starts the session, OFF restores the real GPS and stops it.

## 1. Quick test with Expo Go (optional, instant)

```bash
npm install
npx expo start
```

Install **Expo Go** from the App Store and scan the QR code with the iPhone Camera.

## 2. Build a real app (.ipa) on GitHub

1. Create an empty repo on github.com, then push this folder:
   ```bash
   git remote add origin https://github.com/<you>/click-me.git
   git push -u origin HEAD
   ```
2. On GitHub, open **Actions → Build iOS (unsigned)**. It runs on every push
   (or click **Run workflow**). It takes about 10–20 minutes.
3. When it finishes, download the **ClickMe-ipa** artifact and unzip it to get `ClickMe.ipa`.

## 3. Install on your iPhone from Windows

One-time setup:

- Install **iTunes** and **iCloud** using Apple's installers from apple.com (not the Microsoft Store versions).
- Install **Sideloadly** from sideloadly.io.

Install:

1. Plug in the iPhone and tap **Trust** on the phone.
2. In Sideloadly, drag in `ClickMe.ipa`, enter your Apple ID, and click **Start**.
3. On the iPhone:
   - **Settings → General → VPN & Device Management** → trust your Apple ID.
   - **Settings → Privacy & Security → Developer Mode** → turn on (the phone restarts).

## Every 7 days

With a free Apple ID, the app stops opening after 7 days. Re-run step 3 with the **same**
`ClickMe.ipa` (don't delete the app first, so it keeps its data). You can also turn on
Sideloadly's auto-refresh so it re-signs over Wi-Fi while your PC is on.

You only need a new build (step 2) when you change the code.
