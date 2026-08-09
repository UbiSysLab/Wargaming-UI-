#!/usr/bin/env python3
import os, json, subprocess, sys, threading, socket
from pathlib import Path

# ---------------------------------------------------
# 1️⃣ Detect LAN IP (same logic as the old batch file)
def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

lan_ip = get_lan_ip()
print(f"[INFO] Detected LAN IP: {lan_ip}")

# ---------------------------------------------------
# 1.5️⃣ Automated LAN HTTPS certificate setup and PDF compilation
try:
    import generate_cert
    generate_cert.setup_certs()
    import generate_pdf
    generate_pdf.create_guide()
except Exception as cert_err:
    print(f"[WARNING] Certificate / PDF setup failed: {cert_err}. Using existing files if available.")

# ---------------------------------------------------
# Open firewall for UI ports 8080 and 8081 (requires admin)
def open_firewall():
    try:
        # Port 8080 (HTTPS UI)
        subprocess.run(
            'netsh advfirewall firewall add rule name="Wargaming UI 8080" dir=in action=allow protocol=TCP localport=8080',
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        print("[INFO] Firewall rule added for port 8080")
        
        # Port 8081 (HTTP Setup)
        subprocess.run(
            'netsh advfirewall firewall add rule name="Wargaming UI 8081" dir=in action=allow protocol=TCP localport=8081',
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        print("[INFO] Firewall rule added for port 8081")
    except subprocess.CalledProcessError:
        print("[WARNING] Could not add firewall rules automatically. Run as administrator or add manually.")
open_firewall()
# When running as a PyInstaller bundled exe, __file__ points to a temporary location.
# Use sys._MEIPASS if present, otherwise fall back to the script directory.
import sys
base_dir = Path(sys.argv[0]).parent  # directory where the exe resides (or script folder)
config_path = base_dir / "public" / "config.json"
config_path.parent.mkdir(parents=True, exist_ok=True)
config_path.write_text(json.dumps({"server_ip": lan_ip}, indent=2))
print(f"[INFO] Wrote config.json -> {config_path}")

# ---------------------------------------------------
# Helper to spawn a subprocess and forward its output
def launch(name, cmd, **kwargs):
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, **kwargs
    )
    def forward():
        for line in proc.stdout:
            sys.stdout.buffer.write(f"[{name}] ".encode() + line)
    threading.Thread(target=forward, daemon=True).start()
    return proc

# ---------------------------------------------------
# 3️⃣ Start DNS server (dns_server.py)
# DNS server launch removed – UI will be served directly.
# launch("DNS", f"python \"{Path(__file__).parent / 'dns_server.py'}\"")

# ---------------------------------------------------
# 4️⃣ Start UI server directly (no subprocess)
import ui_server

dist_folder = Path(__file__).parent / 'dist'
if not (dist_folder / 'index.html').exists():
    print('[INFO] dist folder missing. Attempting frontend build...')
    try:
        subprocess.run('npm install', shell=True, check=True)
        subprocess.run('npm run build', shell=True, check=True)
    except Exception as e:
        print(f'[WARNING] Frontend build via npm skipped/failed: {e}')

# Launch the Flask UI server (serves HTTPS from dist/ via Flask)
ui_server.run()

# Keep main process alive until interrupted
try:
    while True:
        pass
except KeyboardInterrupt:
    print("\n[INFO] Shutting down…")
    sys.exit(0)
