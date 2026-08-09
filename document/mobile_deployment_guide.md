# Step-by-Step Deployment Guide: Laptop (Server) & Mobile (Client)

This guide takes you through deploying the wargaming console on a Laptop (Server) and accessing it securely from a Mobile Device (Client) connected to the same LAN.

---

## Step 1: Connect to the Same Network
Ensure your **Laptop** and your **Mobile Phone** are connected to the same Wi-Fi router (LAN).

---

## Step 2: Start the ASR & UI Servers on the Laptop

1.  **Start the ASR Server:**
    Ensure your Python/ASR backend is running on the laptop and listening on port `8000` (e.g. `uvicorn main:app --host 0.0.0.0 --port 8000`).
2.  **Start the UI Server:**
    Double-click **[start_console.bat](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/start_console.bat)** in the project root folder.
    *   This script will display your laptop's current LAN IP address on the screen (e.g., `192.168.1.105`).
    *   It automatically starts Vite, binding it to all interfaces (`0.0.0.0`) on port `5173` with the API proxy active.

---

## Step 3: Enable Mobile Microphone Access (Secure Context Bypass)

Because mobile browsers restrict microphone permissions on insecure `http://` sites (except localhost), you must configure your phone browser to bypass this security block for your laptop's LAN IP:

### A. For Android (Google Chrome)
1.  Open Chrome on your Android device.
2.  Go to this URL: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3.  Tap **Enabled** on the flag.
4.  In the input box below the flag, enter the laptop's URL exactly as displayed by the start script (e.g., `http://192.168.1.105:5173`).
5.  Tap **Relaunch** (or restart Chrome).

### B. For iOS (Safari / Apple Chrome)
Apple Safari restricts `getUserMedia` strictly to SSL/HTTPS on LAN. You must serve the Vite dev server over HTTPS:
1.  Install Vite basic SSL plugin on the laptop:
    ```bash
    npm i @vitejs/plugin-basic-ssl --save-dev
    ```
2.  Add it to your [vite.config.js](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/vite.config.js):
    ```javascript
    import basicSsl from '@vitejs/plugin-basic-ssl'
    
    export default defineConfig({
      plugins: [react(), basicSsl()],
      server: {
        host: true,
        port: 5173,
        proxy: {
          '/transcribe': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true
          }
        }
      }
    });
    ```
3.  Access the site on your iPhone at: `https://192.168.1.105:5173` (tap "Advanced" -> "Proceed anyway" to bypass the self-signed certificate warning).

---

## Step 4: Run the Application on Mobile
1.  Open the web browser on your phone.
2.  Type in the address: `http://<LAPTOP_IP>:5173` (or `https://<LAPTOP_IP>:5173` if running iOS SSL).
3.  Focus the **SITUATION** or **MISSION** textarea. The voice recorder will mount.
4.  Speak into the phone microphone. The waveform baseline will respond to your voice.
5.  Tap **Stop** (`⏹️`). The recording is posted dynamically to the server and the transcription text will populate the focused input box!
