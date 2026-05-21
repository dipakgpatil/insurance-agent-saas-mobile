from __future__ import annotations

import math
from pathlib import Path
from textwrap import dedent

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "play-store-listing-policyoffice"
ASSETS = ROOT / "assets"

BLUE = "#155EEF"
BLUE_DARK = "#0F172A"
BLUE_MID = "#1D4ED8"
TEAL = "#12B981"
INK = "#0F172A"
MUTED = "#64748B"
LINE = "#D8E1EC"
PANEL = "#FFFFFF"
BG = "#F6F9FC"
AMBER = "#F59E0B"
ROSE = "#E11D48"


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    candidates = {
        "regular": [
            r"C:\Windows\Fonts\segoeui.ttf",
            r"C:\Windows\Fonts\arial.ttf",
        ],
        "semibold": [
            r"C:\Windows\Fonts\seguisb.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
        ],
        "bold": [
            r"C:\Windows\Fonts\segoeuib.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
        ],
    }
    for path in candidates.get(weight, candidates["regular"]):
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def rounded_rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def gradient(size: tuple[int, int], start: str, end: str) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, start)
    draw = ImageDraw.Draw(img)
    s = tuple(int(start.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    e = tuple(int(end.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    for y in range(h):
        t = y / max(1, h - 1)
        color = tuple(int(s[i] + (e[i] - s[i]) * t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=color)
    return img


def paste_icon_mark(base: Image.Image, center: tuple[int, int], scale: float = 1.0) -> None:
    draw = ImageDraw.Draw(base)
    cx, cy = center
    tile = int(220 * scale)
    radius = int(46 * scale)
    x0 = cx - tile // 2
    y0 = cy - tile // 2
    rounded_rect(draw, (x0, y0, x0 + tile, y0 + tile), radius, "#FFFFFF")
    draw.text((cx - int(57 * scale), cy - int(47 * scale)), "PO", fill=BLUE_DARK, font=font(int(72 * scale), "bold"))
    for i, length in enumerate([105, 76, 118]):
        y = cy + int((32 + i * 26) * scale)
        draw.rounded_rectangle((cx - int(67 * scale), y, cx - int((67 - length) * scale), y + int(9 * scale)), radius=int(4 * scale), fill="#BFD7FF")
    shield_x = x0 + int(142 * scale)
    shield_y = y0 + int(136 * scale)
    shield = [
        (shield_x, shield_y),
        (shield_x + int(42 * scale), shield_y + int(15 * scale)),
        (shield_x + int(36 * scale), shield_y + int(66 * scale)),
        (shield_x + int(22 * scale), shield_y + int(84 * scale)),
        (shield_x + int(8 * scale), shield_y + int(66 * scale)),
        (shield_x + int(2 * scale), shield_y + int(15 * scale)),
    ]
    draw.polygon(shield, fill=TEAL)
    draw.line(
        [
            (shield_x + int(12 * scale), shield_y + int(43 * scale)),
            (shield_x + int(20 * scale), shield_y + int(52 * scale)),
            (shield_x + int(32 * scale), shield_y + int(30 * scale)),
        ],
        fill="#FFFFFF",
        width=max(2, int(7 * scale)),
        joint="curve",
    )


def app_icon() -> None:
    icon = gradient((512, 512), "#0F172A", "#155EEF")
    draw = ImageDraw.Draw(icon)
    draw.ellipse((340, -42, 560, 178), fill="#16B8A7")
    draw.ellipse((-62, 350, 150, 562), fill="#2E6BF0")
    paste_icon_mark(icon, (256, 252), 1.34)
    icon.save(OUT / "app-icon-512.png", optimize=True)


def feature_graphic() -> None:
    img = gradient((1024, 500), "#0F172A", "#155EEF")
    draw = ImageDraw.Draw(img)
    for r, alpha in [(260, 44), (190, 38), (125, 52)]:
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse((785 - r, 80 - r, 785 + r, 80 + r), fill=(18, 185, 129, alpha))
        od.ellipse((950 - r, 420 - r, 950 + r, 420 + r), fill=(255, 255, 255, alpha // 2))
        img.alpha_composite(overlay) if img.mode == "RGBA" else None
    draw = ImageDraw.Draw(img)
    paste_icon_mark(img, (176, 250), 0.78)
    draw.text((310, 110), "PolicyOffice", fill="#FFFFFF", font=font(58, "bold"))
    draw.text((314, 184), "Insurance work, neatly organised.", fill="#D8EAFE", font=font(30, "semibold"))
    draw.text((314, 248), "Renewals, customers, policy files,\nExcel imports and referrals in one mobile app.", fill="#EAF2FF", font=font(24))
    for i, label in enumerate(["Renewals", "Documents", "Rewards"]):
        x = 314 + i * 160
        rounded_rect(draw, (x, 374, x + 130, 420), 23, "#FFFFFF")
        draw.text((x + 22, 385), label, fill=BLUE_DARK, font=font(19, "bold"))
    img.save(OUT / "feature-graphic-1024x500.png", optimize=True)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        words = para.split()
        line = ""
        for word in words:
            attempt = word if not line else f"{line} {word}"
            if text_size(draw, attempt, fnt)[0] <= max_width:
                line = attempt
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
    return lines


def phone_canvas(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (1080, 1920), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 1080, 210), fill=BLUE_DARK)
    draw.text((72, 58), "PolicyOffice", fill="#FFFFFF", font=font(42, "bold"))
    draw.text((72, 120), "Insurance agent workspace", fill="#BFD7FF", font=font(24))
    draw.text((72, 270), title, fill=INK, font=font(56, "bold"))
    for idx, line in enumerate(wrap(draw, subtitle, font(28), 900)):
        draw.text((74, 350 + idx * 40), line, fill=MUTED, font=font(28))
    return img, draw


def card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, value: str, accent: str = BLUE) -> None:
    rounded_rect(draw, box, 28, PANEL, LINE, 2)
    x0, y0, x1, _ = box
    draw.rounded_rectangle((x0 + 28, y0 + 28, x0 + 86, y0 + 86), radius=16, fill=accent)
    draw.text((x0 + 108, y0 + 26), title, fill=MUTED, font=font(24, "semibold"))
    draw.text((x0 + 108, y0 + 62), value, fill=INK, font=font(44, "bold"))


def bar_chart(draw: ImageDraw.ImageDraw, origin: tuple[int, int], values: list[int], labels: list[str], width: int = 840) -> None:
    x, y = origin
    max_v = max(values)
    gap = 30
    bar_w = (width - gap * (len(values) - 1)) // len(values)
    for i, val in enumerate(values):
        h = int((val / max_v) * 300)
        bx = x + i * (bar_w + gap)
        color = BLUE if i != len(values) - 1 else TEAL
        draw.rounded_rectangle((bx, y + 310 - h, bx + bar_w, y + 310), radius=18, fill=color)
        draw.text((bx + 8, y + 330), labels[i], fill=MUTED, font=font(21, "semibold"))


def screenshot_dashboard() -> None:
    img, draw = phone_canvas("Know today’s work first", "Track renewals, customers and document activity from one calm dashboard.")
    card(draw, (72, 500, 500, 670), "Due this week", "42", BLUE)
    card(draw, (540, 500, 1008, 670), "Customers", "1,284", TEAL)
    card(draw, (72, 710, 500, 880), "Documents", "368", AMBER)
    card(draw, (540, 710, 1008, 880), "Rewards", "₹2.4K", ROSE)
    rounded_rect(draw, (72, 955, 1008, 1420), 30, PANEL, LINE, 2)
    draw.text((112, 1000), "Monthly renewal trend", fill=INK, font=font(32, "bold"))
    bar_chart(draw, (124, 1060), [18, 25, 28, 35, 30, 46], ["Jan", "Feb", "Mar", "Apr", "May", "Jun"])
    rounded_rect(draw, (72, 1490, 1008, 1736), 30, "#EAF2FF", "#BFD7FF", 2)
    draw.text((112, 1532), "Next action", fill=BLUE_DARK, font=font(28, "bold"))
    draw.text((112, 1582), "Call 12 customers whose policies renew in the next 7 days.", fill=BLUE_DARK, font=font(28))
    img.save(OUT / "phone-screenshot-01-dashboard.png", optimize=True)


def screenshot_renewals() -> None:
    img, draw = phone_canvas("Never miss a renewal", "Daily and monthly renewal lists keep follow-ups visible before expiry.")
    rounded_rect(draw, (72, 500, 1008, 630), 28, PANEL, LINE, 2)
    draw.text((112, 536), "May renewals", fill=INK, font=font(34, "bold"))
    draw.text((792, 540), "₹8.7L", fill=TEAL, font=font(36, "bold"))
    rows = [
        ("Dipak Patil", "Health policy", "Today", BLUE),
        ("Sonali Patil", "Motor policy", "Tomorrow", AMBER),
        ("Akshay Patil", "Family floater", "24 May", TEAL),
        ("Anjali Patil", "Term policy", "29 May", ROSE),
    ]
    y = 700
    for name, policy, when, color in rows:
        rounded_rect(draw, (72, y, 1008, y + 170), 28, PANEL, LINE, 2)
        draw.ellipse((112, y + 38, 192, y + 118), fill=color)
        draw.text((220, y + 34), name, fill=INK, font=font(31, "bold"))
        draw.text((220, y + 84), policy, fill=MUTED, font=font(25))
        rounded_rect(draw, (782, y + 48, 958, y + 104), 28, "#F1F5F9", None)
        draw.text((812, y + 62), when, fill=INK, font=font(22, "bold"))
        y += 200
    img.save(OUT / "phone-screenshot-02-renewals.png", optimize=True)


def screenshot_customers() -> None:
    img, draw = phone_canvas("Customer records stay complete", "See policies, family members and attached documents in the customer profile.")
    rounded_rect(draw, (72, 500, 1008, 810), 32, PANEL, LINE, 2)
    draw.ellipse((112, 550, 228, 666), fill=BLUE)
    draw.text((136, 574), "DP", fill="#FFFFFF", font=font(42, "bold"))
    draw.text((260, 548), "DIPAK GORAKH PATIL", fill=INK, font=font(34, "bold"))
    draw.text((260, 606), "8087971651  |  dipakpatil@gmail.com", fill=MUTED, font=font(25))
    card(draw, (112, 700, 388, 778), "Active policies", "3", TEAL)
    card(draw, (414, 700, 954, 778), "Premium under mgmt", "₹62.1K", BLUE)
    rounded_rect(draw, (72, 880, 1008, 1240), 30, PANEL, LINE, 2)
    draw.text((112, 925), "Health cover members", fill=INK, font=font(32, "bold"))
    members = [("Dipak", "41 yrs", "Self"), ("Sonali", "37 yrs", "Spouse"), ("Akshay", "8 yrs", "Son")]
    for i, (name, age, rel) in enumerate(members):
        y = 992 + i * 72
        draw.text((112, y), name, fill=INK, font=font(27, "semibold"))
        draw.text((380, y), age, fill=MUTED, font=font(25))
        draw.text((625, y), rel, fill=MUTED, font=font(25))
    rounded_rect(draw, (72, 1310, 1008, 1680), 30, PANEL, LINE, 2)
    draw.text((112, 1355), "Attached files", fill=INK, font=font(32, "bold"))
    for i, label in enumerate(["Policy schedule.pdf", "Aadhaar front.jpg", "Vehicle RC.pdf"]):
        y = 1430 + i * 76
        draw.rounded_rectangle((112, y, 166, y + 54), radius=12, fill="#EAF2FF")
        draw.text((190, y + 8), label, fill=INK, font=font(25, "semibold"))
        draw.text((850, y + 8), "Preview", fill=BLUE, font=font(24, "bold"))
    img.save(OUT / "phone-screenshot-03-customers.png", optimize=True)


def screenshot_upload() -> None:
    img, draw = phone_canvas("Upload Excel and policy files", "Import customer rows, policy PDFs and scanned images into the agent workspace.")
    rounded_rect(draw, (72, 500, 1008, 805), 30, PANEL, LINE, 2)
    draw.text((112, 545), "Excel onboarding", fill=INK, font=font(34, "bold"))
    draw.text((112, 600), "513 rows processed", fill=TEAL, font=font(48, "bold"))
    draw.text((112, 672), "429 unique policies  |  0 failed rows", fill=MUTED, font=font(28))
    rounded_rect(draw, (112, 722, 394, 774), 26, "#EAF2FF")
    draw.text((148, 735), "View import", fill=BLUE, font=font(22, "bold"))
    rounded_rect(draw, (72, 875, 1008, 1240), 30, PANEL, LINE, 2)
    draw.text((112, 920), "Bulk policy upload", fill=INK, font=font(34, "bold"))
    draw.rounded_rectangle((252, 1012, 828, 1145), radius=30, outline=BLUE, width=4)
    draw.text((332, 1052), "PDFs and scanned images", fill=INK, font=font(31, "bold"))
    draw.text((386, 1098), "Queued for extraction", fill=MUTED, font=font(25))
    rounded_rect(draw, (72, 1310, 1008, 1645), 30, "#ECFDF5", "#BBF7D0", 2)
    draw.text((112, 1360), "Processing status", fill=INK, font=font(32, "bold"))
    for i, (name, status) in enumerate([("policy-pack-001.pdf", "Processing"), ("premium-report.xlsx", "Mapped")]):
        y = 1432 + i * 78
        draw.text((112, y), name, fill=INK, font=font(26, "semibold"))
        draw.text((760, y), status, fill=TEAL, font=font(24, "bold"))
    img.save(OUT / "phone-screenshot-04-upload.png", optimize=True)


def screenshot_referrals() -> None:
    img, draw = phone_canvas("Refer agents. Earn rewards.", "Share your referral link on WhatsApp and track reward points in the app.")
    rounded_rect(draw, (72, 500, 1008, 790), 32, PANEL, LINE, 2)
    draw.text((112, 545), "Your referral code", fill=MUTED, font=font(28, "semibold"))
    draw.text((112, 598), "DIPAK123", fill=INK, font=font(58, "bold"))
    rounded_rect(draw, (112, 690, 500, 750), 30, TEAL)
    draw.text((160, 705), "Share on WhatsApp", fill="#FFFFFF", font=font(25, "bold"))
    rounded_rect(draw, (536, 690, 828, 750), 30, "#EAF2FF")
    draw.text((606, 705), "Copy link", fill=BLUE, font=font(25, "bold"))
    card(draw, (72, 860, 500, 1035), "Available rewards", "₹500", TEAL)
    card(draw, (540, 860, 1008, 1035), "People referred", "4", BLUE)
    rounded_rect(draw, (72, 1110, 1008, 1615), 30, PANEL, LINE, 2)
    draw.text((112, 1155), "Referral activity", fill=INK, font=font(34, "bold"))
    activities = [("Anil Jadhav", "Onboarded", "+500 pts"), ("Atul Shinde", "Signup started", "Pending"), ("Sonali Patil", "Onboarded", "+500 pts")]
    y = 1238
    for name, status, points in activities:
        draw.text((112, y), name, fill=INK, font=font(27, "semibold"))
        draw.text((112, y + 40), status, fill=MUTED, font=font(23))
        draw.text((820, y + 8), points, fill=TEAL if points.startswith("+") else AMBER, font=font(24, "bold"))
        y += 118
    img.save(OUT / "phone-screenshot-05-referrals.png", optimize=True)


def metadata() -> None:
    short_description = "Renewals, customers, documents and rewards for insurance agents."
    full_description = dedent(
        """
        PolicyOffice helps insurance agents manage renewals, customers, policy documents, Excel imports and referral rewards from one mobile workspace.

        Built for Indian insurance agents and agency teams, PolicyOffice keeps daily work organised so follow-ups do not depend on scattered spreadsheets, reminder notes or manual file folders.

        Key features:
        • Renewal dashboard for upcoming policy follow-ups
        • Customer and policy records in one tenant-scoped workspace
        • Policy PDF and scanned document upload
        • Excel import support for customer and policy data
        • Customer profile with attached files and policy history
        • Birthday and renewal reminders
        • Referral link sharing and reward tracking
        • WhatsApp-friendly actions for agent workflows
        • Secure login and role-based access through the PolicyOffice platform

        PolicyOffice is designed for insurance professionals who need a simple mobile way to track business, organise documents, and stay ahead of renewal conversations.

        This first release is intended for closed testing. Some capabilities may depend on your PolicyOffice workspace, backend configuration and subscription access.
        """
    ).strip()
    whats_new = dedent(
        """
        Initial closed-testing release for PolicyOffice.

        Includes login, onboarding, dashboard, renewals, customers, document upload, Excel import support, referrals and reward tracking.
        """
    ).strip()
    notes = dedent(
        f"""
        # PolicyOffice Google Play Store Listing Pack

        ## Upload-Ready Graphics
        - `app-icon-512.png` - Play app icon, 512 x 512 PNG.
        - `feature-graphic-1024x500.png` - Play feature graphic, 1024 x 500 PNG.
        - `phone-screenshot-01-dashboard.png` - Phone screenshot, 1080 x 1920 PNG.
        - `phone-screenshot-02-renewals.png` - Phone screenshot, 1080 x 1920 PNG.
        - `phone-screenshot-03-customers.png` - Phone screenshot, 1080 x 1920 PNG.
        - `phone-screenshot-04-upload.png` - Phone screenshot, 1080 x 1920 PNG.
        - `phone-screenshot-05-referrals.png` - Phone screenshot, 1080 x 1920 PNG.

        ## App Details
        App name:
        PolicyOffice

        Package name:
        com.policyoffice.mobile

        Category suggestion:
        Business

        Short description ({len(short_description)} / 80):
        {short_description}

        Full description:
        {full_description}

        What's new:
        {whats_new}

        ## Suggested Store Listing Tags / Positioning
        Insurance agent CRM, policy renewal tracking, document management, Excel import, referral rewards.

        ## Data Safety Notes For Console
        Use the actual backend policy and legal review before submission. Suggested starting point:
        - App requires login.
        - App may process customer contact details, policy data, uploaded files and account identifiers.
        - Data is used for account management, customer/policy management, document storage and app functionality.
        - Sensitive customer data should not be shown publicly in store screenshots.
        """
    ).strip()
    (OUT / "store-listing-copy.md").write_text(notes + "\n", encoding="utf-8")
    (OUT / "short-description.txt").write_text(short_description + "\n", encoding="utf-8")
    (OUT / "full-description.txt").write_text(full_description + "\n", encoding="utf-8")
    (OUT / "whats-new.txt").write_text(whats_new + "\n", encoding="utf-8")


def contact_sheet() -> None:
    files = [
        "app-icon-512.png",
        "feature-graphic-1024x500.png",
        "phone-screenshot-01-dashboard.png",
        "phone-screenshot-02-renewals.png",
        "phone-screenshot-03-customers.png",
        "phone-screenshot-04-upload.png",
        "phone-screenshot-05-referrals.png",
    ]
    sheet = Image.new("RGB", (1600, 1900), "#F8FAFC")
    draw = ImageDraw.Draw(sheet)
    draw.text((60, 44), "PolicyOffice Play Store Listing Pack", fill=INK, font=font(48, "bold"))
    x, y = 60, 140
    for name in files:
        img = Image.open(OUT / name).convert("RGB")
        max_w, max_h = (480, 260) if "feature" in name else (260, 460)
        ratio = min(max_w / img.width, max_h / img.height)
        resized = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)
        rounded_rect(draw, (x - 12, y - 12, x + max_w + 12, y + max_h + 64), 22, "#FFFFFF", LINE, 2)
        sheet.paste(resized, (x, y))
        draw.text((x, y + max_h + 18), name, fill=MUTED, font=font(20, "semibold"))
        x += max_w + 74
        if x > 1200:
            x = 60
            y += max_h + 120
    sheet.save(OUT / "preview-contact-sheet.png", optimize=True)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    app_icon()
    feature_graphic()
    screenshot_dashboard()
    screenshot_renewals()
    screenshot_customers()
    screenshot_upload()
    screenshot_referrals()
    metadata()
    contact_sheet()
    print(f"Created Play Store listing pack at {OUT}")


if __name__ == "__main__":
    main()
