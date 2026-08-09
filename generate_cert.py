import sys
import os
import socket
import ipaddress
from pathlib import Path
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# Use the executable's directory if frozen, otherwise the script's directory
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.argv[0]).parent
else:
    BASE_DIR = Path(__file__).parent.resolve()

CERT_DIR = BASE_DIR / 'certs'
CERT_DIR.mkdir(exist_ok=True)

CA_KEY_PATH = CERT_DIR / 'ca.key'
CA_CERT_PATH = CERT_DIR / 'ca.crt'  # .crt is best for mobile device installer recognition
LEAF_KEY_PATH = CERT_DIR / 'key.pem'
LEAF_CERT_PATH = CERT_DIR / 'cert.pem'

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def generate_root_ca():
    """Generate a persistent Root CA if it does not exist."""
    if CA_KEY_PATH.exists() and CA_CERT_PATH.exists():
        print("[INFO] Persistent Root CA already exists.")
        return

    print("[INFO] Generating new persistent Root CA...")
    # Generate private key
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    CA_KEY_PATH.write_bytes(
        ca_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    # Generate self-signed CA cert
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"ISSA LAN Root CA"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"ISSA"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, u"ISSA"),
    ])
    
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow() - timedelta(days=1))
        .not_valid_after(datetime.utcnow() + timedelta(days=3650))  # 10 years
        .add_extension(
            x509.BasicConstraints(ca=True, path_length=None),
            critical=True,
        )
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )
    
    CA_CERT_PATH.write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    print(f"[INFO] Root CA created: cert at {CA_CERT_PATH}, key at {CA_KEY_PATH}")

def check_leaf_valid(lan_ip):
    """Check if the existing leaf certificate is valid and covers the current LAN IP."""
    if not LEAF_KEY_PATH.exists() or not LEAF_CERT_PATH.exists():
        return False
    
    try:
        cert_bytes = LEAF_CERT_PATH.read_bytes()
        cert = x509.load_pem_x509_certificate(cert_bytes)
        
        # Check if CA cert exists and if leaf issuer matches CA subject
        if CA_CERT_PATH.exists():
            ca_cert = x509.load_pem_x509_certificate(CA_CERT_PATH.read_bytes())
            if cert.issuer != ca_cert.subject:
                print("[INFO] Server certificate issuer does not match current Root CA. Regenerating...")
                return False
        else:
            return False
        
        # Check expiration (give 30 days buffer)
        if cert.not_valid_after < datetime.utcnow() + timedelta(days=30):
            print("[INFO] Server certificate is close to expiration or expired. Regenerating...")
            return False
        
        # Check if current IP is in Subject Alternative Names
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        ip_found = False
        target_ip_obj = ipaddress.ip_address(lan_ip)
        
        for name in san.value:
            if isinstance(name, x509.IPAddress) and name.value == target_ip_obj:
                ip_found = True
                break
            elif isinstance(name, x509.DNSName) and name.value == lan_ip:
                ip_found = True
                break
                
        if not ip_found:
            print(f"[INFO] Server certificate does not cover current LAN IP ({lan_ip}). Regenerating...")
            return False
            
        print("[INFO] Existing server certificate is valid and covers current LAN IP.")
        return True
    except Exception as e:
        print(f"[WARNING] Error checking existing leaf cert: {e}. Regenerating...")
        return False

def generate_leaf_cert(lan_ip):
    """Generate and sign a new leaf cert for the given LAN IP."""
    if check_leaf_valid(lan_ip):
        return

    print(f"[INFO] Generating and signing new server certificate for LAN IP: {lan_ip}...")
    
    # Load CA cert and key
    ca_key = serialization.load_pem_private_key(CA_KEY_PATH.read_bytes(), password=None)
    ca_cert = x509.load_pem_x509_certificate(CA_CERT_PATH.read_bytes())
    
    # Generate Leaf Key
    leaf_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    LEAF_KEY_PATH.write_bytes(
        leaf_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    
    # Setup SAN names
    sans = [
        x509.DNSName(u"localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
    ]
    
    # Add active LAN IP
    try:
        ip_obj = ipaddress.ip_address(lan_ip)
        sans.append(x509.IPAddress(ip_obj))
    except ValueError:
        pass
    
    # Also add as DNS name for fallback compatibility
    sans.append(x509.DNSName(str(lan_ip)))
    
    # Generate Leaf Certificate
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, str(lan_ip)),
    ])
    
    leaf_cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(leaf_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow() - timedelta(days=1))
        .not_valid_after(datetime.utcnow() + timedelta(days=1095)) # 3 years
        .add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        )
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=True,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False,
        )
        .add_extension(
            x509.SubjectAlternativeName(sans),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )
    
    LEAF_CERT_PATH.write_bytes(leaf_cert.public_bytes(serialization.Encoding.PEM))
    print(f"[INFO] Server certificate generated successfully: {LEAF_CERT_PATH}")

def setup_certs():
    """Main orchestrator function to set up CA and Leaf Certs."""
    generate_root_ca()
    lan_ip = get_lan_ip()
    generate_leaf_cert(lan_ip)

if __name__ == '__main__':
    setup_certs()
