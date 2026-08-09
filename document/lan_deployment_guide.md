# LAN Deployment Best Practices Guide: Dynamic IP Configuration

This guide details how to configure and run the wargaming console in local area network (LAN) environments where the server's IP address changes dynamically (DHCP auto-assignment).

---

## 1. The Challenge of Changing IPs

When the host server's LAN IP changes (e.g., from `192.168.1.100` to `192.168.1.108`):
1.  **Hardcoded Bindings Fail:** Web servers bound to specific IPs fail to start.
2.  **Client Access Breaks:** Clients do not know which address to navigate to.

To build a zero-maintenance setup, configure the application to resolve and bind **dynamically**.

---

## 2. Dynamic Server Binding (Wildcard Binding)

Never specify a single IP address in your Caddy or Nginx configurations. Bind to **all available interfaces** using wildcard hosts (`:port` or `0.0.0.0`):

### Caddy Configuration (Caddyfile)
```caddy
:443 {
    # Bind to standard HTTPS port on ANY active LAN IP
    tls internal
    root * /path/to/dist
    file_server

    # Reverse proxy backend API relatively
    reverse_proxy /transcribe* 127.0.0.1:8000
}
```

### Vite Configuration (Vite.config.js / Dev mode)
We bind Vite to `0.0.0.0`, meaning it will dynamically listen to whatever IP address the host computer currently possesses:
```javascript
export default defineConfig({
  server: {
    host: true, // binds to 0.0.0.0
    port: 5173
  }
});
```

---

## 3. How Clients Find the Server Automatically

### Method A: Multicast DNS (mDNS) - Highly Recommended
Modern operating systems (Windows, macOS, Linux) resolve local hostnames automatically using mDNS.
*   Clients do not need to type the IP address. They just navigate to:
    `http://<SERVER_NAME>.local:5173`
*   Replace `<SERVER_NAME>` with the host computer's name (e.g. `wargaming-desktop.local`).
*   mDNS resolves the address to the server's active IP address dynamically.

### Method B: Automated Startup IP Display Script
We created a startup batch file, **[start_console.bat](file:///c:/Users/Nikhil Vidhani/Desktop/Wargaming-UI-/start_console.bat)**, inside the root folder. 
When double-clicked:
1.  It automatically queries the server's active LAN IPv4 network address.
2.  It prints the exact client connection instructions on the console screen:
    ` Wargaming Console is running! Please navigate to http://192.168.1.108:5173 `
3.  It starts the Vite service.

This allows any administrator to see the active connection URL immediately on startup.
