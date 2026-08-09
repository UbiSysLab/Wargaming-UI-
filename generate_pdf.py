import sys
import os
import socket
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def generate_pdf_guide(lan_ip, output_path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom colors
    primary_color = colors.HexColor('#0369a1') # Sky blue dark
    text_color = colors.HexColor('#1e293b') # Slate 800
    subtext_color = colors.HexColor('#475569') # Slate 600
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=subtext_color,
        spaceAfter=20
    )
    
    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=text_color,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=8
    )

    story = []
    
    # Header Titles
    story.append(Paragraph("ISSA Simulation Lab", title_style))
    story.append(Paragraph("Microphone & Security Setup Guide", title_style))
    story.append(Paragraph("This step-by-step guide helps you connect your phone or tablet to the ISSA simulation server and securely enable microphone access.", subtitle_style))
    
    # Quick Info Box
    info_data = [
        [Paragraph("<b>Server IP Address:</b>", body_style), Paragraph(lan_ip, body_style)],
        [Paragraph("<b>Plain Link (Setup):</b>", body_style), Paragraph(f"http://{lan_ip}:8080/setup", body_style)],
        [Paragraph("<b>Secure Link (App):</b>", body_style), Paragraph(f"https://{lan_ip}:8080/", body_style)]
    ]
    info_table = Table(info_data, colWidths=[130, 340])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))
    
    # Step 1
    story.append(Paragraph("Step 1: Download the Security Certificate", h1_style))
    story.append(Paragraph(f"1. Connect your phone or tablet to the <b>same Wi-Fi network</b> as the server computer.", bullet_style))
    story.append(Paragraph(f"2. Open the web browser (Safari or Chrome) on your device.", bullet_style))
    story.append(Paragraph(f"3. Type the following URL in the address bar and press Enter:<br/><b>http://{lan_ip}:8080/setup</b>", bullet_style))
    story.append(Paragraph("4. On the setup page, tap the <b>Download Certificate</b> button to save the file.", bullet_style))
    story.append(Spacer(1, 5))

    # Step 2
    story.append(Paragraph("Step 2: Install the Certificate on your Device", h1_style))
    
    # iOS
    story.append(Paragraph("<b>For Apple iOS / iPadOS (iPhone / iPad):</b>", body_style))
    story.append(Paragraph("1. Tap <b>Allow</b> when prompted to download the configuration profile.", bullet_style))
    story.append(Paragraph("2. Go to your home screen and open the <b>Settings</b> app.", bullet_style))
    story.append(Paragraph("3. Tap <b>Profile Downloaded</b> at the very top of the settings list.", bullet_style))
    story.append(Paragraph("4. Tap <b>Install</b> in the top-right corner, enter your passcode, and confirm.", bullet_style))
    story.append(Paragraph("5. Go back to the main Settings screen, and navigate to:<br/><b>General</b> &rarr; <b>About</b> &rarr; <b>Certificate Trust Settings</b> (at the very bottom).", bullet_style))
    story.append(Paragraph("6. Under <i>'Enable full trust for root certificates'</i>, turn <b>ON</b> the toggle for <b>ISSA LAN Root CA</b> and choose <b>Continue</b>.", bullet_style))
    story.append(Spacer(1, 5))

    # Android
    story.append(Paragraph("<b>For Android (Samsung, Google Pixel, OnePlus, etc.):</b>", body_style))
    story.append(Paragraph("1. Tap the download link. The <code>ca.crt</code> file will download to your device.", bullet_style))
    story.append(Paragraph("2. Open your device's <b>Settings</b> app.", bullet_style))
    story.append(Paragraph("3. Search for <b>'CA Certificate'</b> in Settings (or go to <b>Security</b> &rarr; <b>More Security Settings</b> &rarr; <b>Encryption & Credentials</b> &rarr; <b>Install a Certificate</b>).", bullet_style))
    story.append(Paragraph("4. Select <b>CA Certificate</b>. If a warning appears, tap <b>Install Anyway</b>.", bullet_style))
    story.append(Paragraph("5. Select the downloaded <code>ca.crt</code> file and tap <b>Done</b>.", bullet_style))
    story.append(Spacer(1, 5))

    # Step 3
    story.append(Paragraph("Step 3: Open the ISSA Application UI", h1_style))
    story.append(Paragraph("1. Close your browser app completely (swipe it away from your open apps list).", bullet_style))
    story.append(Paragraph(f"2. Reopen the browser and go to:<br/><b>https://{lan_ip}:8080/</b>", bullet_style))
    story.append(Paragraph("3. The browser will now show a secure connection (lock icon) and the microphone will work perfectly!", bullet_style))
    
    doc.build(story)

def create_guide():
    lan_ip = get_lan_ip()
    
    # Save to Desktop
    desktop_path = Path(os.environ['USERPROFILE']) / 'Desktop' / 'Microphone_Setup_Guide.pdf'
    try:
        generate_pdf_guide(lan_ip, desktop_path)
        print(f"[INFO] PDF guide generated at Desktop: {desktop_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save PDF to Desktop: {e}")
        
    # Save to certs folder so server can serve it
    if getattr(sys, 'frozen', False):
        certs_dir = Path(sys.argv[0]).parent / 'certs'
    else:
        certs_dir = Path(__file__).parent.resolve() / 'certs'
    certs_dir.mkdir(exist_ok=True)
    server_path = certs_dir / 'guide.pdf'
    try:
        generate_pdf_guide(lan_ip, server_path)
        print(f"[INFO] PDF guide generated for server downloads: {server_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save PDF to server certs dir: {e}")

if __name__ == '__main__':
    create_guide()
