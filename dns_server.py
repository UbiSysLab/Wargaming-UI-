#!/usr/bin/env python3
import socket
import threading
from dnslib import DNSRecord, DNSHeader, RR, A, QTYPE

PUBLIC_DNS = "8.8.8.8"

# ---------------------------------------------------
# Resolve our own LAN IP – same logic as server.py

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

LAN_IP = get_lan_ip()

def handle(data, addr, sock):
    try:
        request = DNSRecord.parse(data)
        qname = str(request.q.qname).rstrip('.')
        reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
        if qname.lower() == "wargaming.com" or qname.lower().endswith('.wargaming.com'):
            reply.add_answer(RR(qname, QTYPE.A, rdata=A(LAN_IP), ttl=300))
            print(f"[DNS] Resolving {qname} → {LAN_IP}")
        else:
            # Forward to public DNS
            forward_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            forward_sock.settimeout(2)
            forward_sock.sendto(data, (PUBLIC_DNS, 53))
            resp, _ = forward_sock.recvfrom(4096)
            forward_sock.close()
            sock.sendto(resp, addr)
            return
        sock.sendto(reply.pack(), addr)
    except Exception as e:
        print(f"[DNS] Error handling request: {e}")

def serve():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", 53))
    print("[DNS] Server listening on UDP 53 (Ctrl‑C to stop)")
    while True:
        data, addr = sock.recvfrom(512)
        threading.Thread(target=handle, args=(data, addr, sock), daemon=True).start()

if __name__ == "__main__":
    serve()
