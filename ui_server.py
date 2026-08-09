#!/usr/bin/env python3
import os
import pathlib
import subprocess
import logging
from flask import Flask, send_from_directory, request, Response
import requests

# Configure basic logging – INFO level will show request logs
logging.basicConfig(level=logging.INFO)

class BadRequestFilter(logging.Filter):
    def filter(self, record):
        msg = record.getMessage()
        # Suppress browser background HTTPS-first upgrade probe warnings on the HTTP port
        if "code 400" in msg or "message Bad request" in msg or "\\x16" in msg or "Bad HTTP/0.9 request" in msg or "Bad request version" in msg:
            return False
        return True

# Apply filter to werkzeug logger to suppress binary SSL probe noise
logging.getLogger('werkzeug').addFilter(BadRequestFilter())


import sys
from pathlib import Path

# Determine base directory and static folder path (works for PyInstaller bundles)
if getattr(sys, 'frozen', False):
    # PyInstaller extracts bundled files to sys._MEIPASS
    STATIC_ROOT = Path(sys._MEIPASS) / 'dist'
    BASE_DIR = Path(sys.argv[0]).parent  # Keep config/certs permanent in exe dir
else:
    BASE_DIR = Path(__file__).parent.resolve()
    STATIC_ROOT = BASE_DIR / 'dist'

app = Flask(__name__, static_folder=str(STATIC_ROOT), static_url_path='')

# Enable Flask request logging
app.logger.setLevel(logging.INFO)

# Log each incoming request (method and path)
@app.before_request
def log_request():
    app.logger.info(f"{request.method} {request.path}")

# ---------------------------------------------------
# Serve static files (React build) or fallback to index.html
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def static_files(path):
    # Serve files from the bundled 'dist' folder
    if path and (STATIC_ROOT / path).exists():
        return send_from_directory(str(STATIC_ROOT), path)
    # If the file is not found, serve the React index.html (also in 'dist')
    return send_from_directory(str(STATIC_ROOT), 'index.html')

# ---------------------------------------------------
# ---------------------------------------------------
# Setup App and Dual-Port Helpers

setup_app = Flask("setup_server")

def serve_cert_file():
    return send_from_directory(str(BASE_DIR / 'certs'), 'ca.crt', as_attachment=True, mimetype='application/x-x509-ca-cert')

def serve_guide_file():
    return send_from_directory(str(BASE_DIR / 'certs'), 'guide.pdf', as_attachment=True, mimetype='application/pdf')

def get_setup_html(server_ip):
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>Microphone Security Setup</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #cbd5e1;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }}
        .container {{
            max-width: 600px;
            width: 100%;
            background: #1e293b;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            border: 1px solid #334155;
            box-sizing: border-box;
        }}
        h1 {{
            color: #38bdf8;
            font-size: 24px;
            margin-top: 0;
            text-align: center;
            font-weight: 700;
        }}
        .btn-download {{
            display: block;
            text-align: center;
            background: #0284c7;
            color: #fff;
            padding: 15px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 24px 0;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
            transition: all 0.2s;
        }}
        .btn-download:hover {{
            background: #0369a1;
            transform: translateY(-1px);
        }}
        .btn-download:active {{
            transform: translateY(1px);
        }}
        .section {{
            margin-bottom: 25px;
            border-bottom: 1px solid #334155;
            padding-bottom: 20px;
        }}
        .section:last-child {{
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }}
        h2 {{
            font-size: 18px;
            color: #f1f5f9;
            margin-top: 0;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            font-weight: 600;
        }}
        ol {{
            padding-left: 20px;
            margin: 0;
        }}
        li {{
            margin-bottom: 12px;
            line-height: 1.6;
            color: #cbd5e1;
        }}
        .badge {{
            background: #334155;
            color: #94a3b8;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }}
        .ios-badge {{ background: #0284c7; color: white; }}
        .android-badge {{ background: #22c55e; color: white; }}
        .step3-badge {{ background: #eab308; color: #0f172a; }}
        b {{
            color: #f8fafc;
        }}
        a.link {{
            color: #38bdf8;
            text-decoration: none;
            font-weight: 600;
        }}
        a.link:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎙️ Microphone Setup Guide</h1>
        <p style="text-align: center; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
            To record audio over Wi-Fi, your device needs to trust this server's connection. Please follow the instructions below:
        </p>
        
        <a href="/cert" class="btn-download">📥 Step 1: Download Certificate</a>
        <a href="/guide.pdf" class="btn-download" style="background: #475569; box-shadow: 0 4px 12px rgba(71, 85, 105, 0.3); margin-top: -12px;">📄 Download PDF Setup Guide</a>
        
        <div class="section">
            <h2>Apple iOS / iPadOS <span class="badge ios-badge">iPhone / iPad</span></h2>
            <ol>
                <li>Tap the <b>Download Certificate</b> button above. Tap <b>Allow</b> when asked to download a configuration profile.</li>
                <li>Go to your home screen and open the <b>Settings</b> app.</li>
                <li>Tap the new <b>Profile Downloaded</b> button at the very top.</li>
                <li>Tap <b>Install</b> in the upper-right corner, enter your device passcode, and confirm installation.</li>
                <li>Go back to the main Settings screen, and go to: <br><b>General</b> &rarr; <b>About</b> &rarr; <b>Certificate Trust Settings</b> (at the very bottom).</li>
                <li>Under "Enable full trust for root certificates", turn <b>ON</b> the switch for <b>ISSA LAN Root CA</b> and tap <b>Continue</b>.</li>
            </ol>
        </div>
        
        <div class="section">
            <h2>Android <span class="badge android-badge">Samsung / Pixel / OnePlus</span></h2>
            <ol>
                <li>Tap the <b>Download Certificate</b> button above. The <code>ca.crt</code> file will download to your device.</li>
                <li>Open your device's <b>Settings</b> app.</li>
                <li>Search or navigate to: <br><b>Security</b> (or <b>Security & Privacy</b>) &rarr; <b>More Security Settings</b> &rarr; <b>Encryption & Credentials</b> &rarr; <b>Install a Certificate</b>.</li>
                <li>Tap <b>CA Certificate</b>. If a warning appears, tap <b>Install Anyway</b>.</li>
                <li>Select the downloaded <code>ca.crt</code> file and tap <b>Done</b> to complete the installation.</li>
            </ol>
        </div>
        
        <div class="section">
            <h2>🎉 Step 3: Open Application <span class="badge step3-badge">Final Step</span></h2>
            <ol>
                <li>Close your web browser app (Safari/Chrome) completely.</li>
                <li>Reopen your browser and go to: <a href="https://{server_ip}:8080/" class="link">Go to Application UI (https://{server_ip}:8080/)</a>.</li>
                <li>The browser will now load the page securely and microphone access will work perfectly!</li>
            </ol>
        </div>
    </div>
</body>
</html>"""

# Main HTTPS Server Routes
@app.route('/cert')
@app.route('/ca')
def download_ca():
    return serve_cert_file()

@app.route('/guide')
@app.route('/guide.pdf')
def download_guide():
    return serve_guide_file()

@app.route('/setup')
def setup_instructions():
    server_ip = request.host.split(':')[0]
    return get_setup_html(server_ip)

# Plain HTTP Setup Server Routes
@setup_app.route('/cert')
@setup_app.route('/ca')
def setup_download_ca():
    return serve_cert_file()

@setup_app.route('/guide')
@setup_app.route('/guide.pdf')
def setup_download_guide():
    return serve_guide_file()

@setup_app.route('/')
@setup_app.route('/setup')
def setup_app_instructions():
    server_ip = request.host.split(':')[0]
    return get_setup_html(server_ip)

# Serve the generated config.json (used by the UI for LAN IP discovery)
@app.route('/config.json')
def serve_config():
    config_path = BASE_DIR / 'public' / 'config.json'
    if config_path.exists():
        return send_from_directory(str(config_path.parent), config_path.name)
    return "{}", 404

# ---------------------------------------------------
# ASR LAN-wide Dynamic Discovery Helpers

import socket
import concurrent.futures

discovered_asr_ip_addr = "127.0.0.1"

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def check_port(ip, port):
    try:
        # Instead of raw TCP, check if it actually responds to HTTP GET on port 8000.
        # This confirms that the target is a web server and not a generic device with port 8000 open.
        url = f"http://{ip}:{port}/"
        resp = requests.get(url, timeout=0.25)
        # Any response (even a 404 or 401) confirms it is an active HTTP server on that port
        return ip
    except Exception:
        return None

def discover_asr_ip(server_ip):
    # 1. Check local port 8000 first (runs on same laptop)
    if check_port("127.0.0.1", 8000):
        print("[ASR Discovery] Found ASR running locally on 127.0.0.1:8000")
        return "127.0.0.1"
        
    # 2. Scan LAN subnet on port 8000 (runs on different laptop)
    parts = server_ip.split('.')
    if len(parts) != 4:
        return "127.0.0.1"
    subnet_prefix = f"{parts[0]}.{parts[1]}.{parts[2]}."
    print(f"[ASR Discovery] ASR not found on localhost. Scanning subnet {subnet_prefix}0/24 on port 8000...")
    
    ips_to_scan = [f"{subnet_prefix}{i}" for i in range(2, 255) if f"{subnet_prefix}{i}" != server_ip]
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(check_port, ip, 8000): ip for ip in ips_to_scan}
        for future in concurrent.futures.as_completed(futures):
            found_ip = future.result()
            if found_ip:
                print(f"[ASR Discovery] Found ASR running on LAN IP: {found_ip}:8000")
                return found_ip
                
    print("[ASR Discovery] No ASR server found on LAN. Defaulting to 127.0.0.1")
    return "127.0.0.1"

# Proxy /transcribe to the ASR backend (port 8000)
@app.route('/transcribe', methods=['POST'])
def proxy_transcribe():
    global discovered_asr_ip_addr
    override_url = os.getenv('ASR_URL')
    if override_url:
        asr_url = override_url
    else:
        asr_url = f"http://{discovered_asr_ip_addr}:8000/transcribe"
        
    print(f"[UI Proxy] Routing transcription request to ASR: {asr_url}")
    try:
        resp = requests.post(asr_url, data=request.get_data(), headers={'Content-Type': request.headers.get('Content-Type')}, timeout=30)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type'))
    except Exception as e:
        print(f"[WARNING] Failed to connect to ASR at {asr_url}: {e}")
        
        # Self-healing dynamic LAN re-discovery if not explicitly overridden
        if not override_url:
            print("[UI Proxy] ASR unreachable. Initiating dynamic LAN re-discovery...")
            server_ip = get_lan_ip()
            new_ip = discover_asr_ip(server_ip)
            if new_ip != "127.0.0.1" and new_ip != discovered_asr_ip_addr:
                discovered_asr_ip_addr = new_ip
                asr_url = f"http://{discovered_asr_ip_addr}:8000/transcribe"
                print(f"[UI Proxy] Retrying transcription request to new ASR IP: {asr_url}")
                try:
                    resp = requests.post(asr_url, data=request.get_data(), headers={'Content-Type': request.headers.get('Content-Type')}, timeout=30)
                    return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type'))
                except Exception:
                    pass
        return "ASR Server Unreachable", 502

# Generic catch-all proxy to route ANY request to the active ASR server (port 8000)
@app.route('/asr/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_asr_any(path):
    global discovered_asr_ip_addr
    override_url = os.getenv('ASR_URL')
    
    def build_url(ip):
        if override_url:
            from urllib.parse import urlparse
            parsed = urlparse(override_url)
            base = f"{parsed.scheme}://{parsed.netloc}"
        else:
            base = f"http://{ip}:8000"
            
        target = f"{base}/{path}"
        if request.query_string:
            target = f"{target}?{request.query_string.decode('utf-8')}"
        return target

    asr_url = build_url(discovered_asr_ip_addr)
    print(f"[UI Proxy] Routing ASR request ({request.method}) to: {asr_url}")
    
    def do_proxy(url):
        return requests.request(
            method=request.method,
            url=url,
            headers={key: value for key, value in request.headers if key.lower() != 'host'},
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False,
            timeout=30
        )

    try:
        resp = do_proxy(asr_url)
    except Exception as e:
        print(f"[WARNING] Failed to proxy ASR request to {asr_url}: {e}")
        
        # Self-healing dynamic LAN re-discovery if not explicitly overridden
        if not override_url:
            print("[UI Proxy] ASR unreachable. Initiating dynamic LAN re-discovery...")
            server_ip = get_lan_ip()
            new_ip = discover_asr_ip(server_ip)
            if new_ip != "127.0.0.1" and new_ip != discovered_asr_ip_addr:
                discovered_asr_ip_addr = new_ip
                asr_url = build_url(discovered_asr_ip_addr)
                print(f"[UI Proxy] Retrying ASR request to new ASR IP: {asr_url}")
                try:
                    resp = do_proxy(asr_url)
                except Exception:
                    return "ASR Server Unreachable", 502
            else:
                return "ASR Server Unreachable", 502
        else:
            return "ASR Server Unreachable", 502
            
    # Strip hop-by-hop encoding/content headers that requests handles
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = [(name, value) for (name, value) in resp.raw.headers.items()
               if name.lower() not in excluded_headers]
               
    return Response(resp.content, status=resp.status_code, headers=headers)

def run():
    app.debug = True
    if not STATIC_ROOT.exists():
        print(f'[UI] dist folder missing at {STATIC_ROOT} – launching Vite dev server (port 5173)')
        subprocess.Popen('npm run dev -- --host 0.0.0.0 --port 5173', shell=True)
        app.run(host='0.0.0.0', port=5173, use_reloader=False)
    else:
        # Detect ASR server location on start
        global discovered_asr_ip_addr
        server_ip = get_lan_ip()
        discovered_asr_ip_addr = discover_asr_ip(server_ip)
        
        print(f'[UI] Serving built React app from {STATIC_ROOT} on port 8080 (HTTPS)')
        print(f'[ASR] Routing all transcription & ASR proxy requests to: http://{discovered_asr_ip_addr}:8000')
        
        # Start the plain HTTP setup server on port 8081 in a background thread
        import threading
        def run_setup_app():
            try:
                setup_app.run(host='0.0.0.0', port=8081, debug=False, use_reloader=False)
            except Exception as e:
                print(f"[WARNING] Could not start HTTP setup server on port 8081: {e}")
                
        threading.Thread(target=run_setup_app, daemon=True).start()
        print('[UI] Plain HTTP Setup server started on http://0.0.0.0:8081 (for certificate download)')
        
        app.run(host='0.0.0.0', port=8080, ssl_context=('certs/cert.pem', 'certs/key.pem'), use_reloader=False)

if __name__ == '__main__':
    run()

