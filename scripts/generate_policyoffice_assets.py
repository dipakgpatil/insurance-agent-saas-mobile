from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
NAVY = (15, 23, 42, 255)
BLUE = (37, 99, 235, 255)
TEAL = (20, 184, 166, 255)
WHITE = (255, 255, 255, 255)
MUTED = (226, 232, 240, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def gradient(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), NAVY)
    pix = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (size * 2)
            r = int(NAVY[0] * (1 - t) + BLUE[0] * t)
            g = int(NAVY[1] * (1 - t) + BLUE[1] * t)
            b = int(NAVY[2] * (1 - t) + BLUE[2] * t)
            pix[x, y] = (r, g, b, 255)
    return img


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def draw_centered(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill, font_obj) -> None:
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((xy[0] - w / 2, xy[1] - h / 2 - bbox[1]), text, fill=fill, font=font_obj)


def logo_mark(size: int, *, with_shadow: bool = True) -> Image.Image:
    scale = size / 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_shadow:
        shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle(
            (int(206 * scale), int(186 * scale), int(818 * scale), int(838 * scale)),
            radius=int(132 * scale),
            fill=(0, 0, 0, 80),
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(6, int(24 * scale))))
        img.alpha_composite(shadow)

    # Office document tile.
    tile = (int(216 * scale), int(176 * scale), int(808 * scale), int(828 * scale))
    draw.rounded_rectangle(tile, radius=int(120 * scale), fill=WHITE)
    draw.polygon(
        [
            (int(646 * scale), int(176 * scale)),
            (int(808 * scale), int(338 * scale)),
            (int(646 * scale), int(338 * scale)),
        ],
        fill=(219, 234, 254, 255),
    )
    draw.line(
        [(int(646 * scale), int(176 * scale)), (int(646 * scale), int(338 * scale)), (int(808 * scale), int(338 * scale))],
        fill=(147, 197, 253, 255),
        width=max(2, int(6 * scale)),
    )

    # Policy lines.
    for y in [394, 462, 530]:
        draw.rounded_rectangle(
            (int(324 * scale), int(y * scale), int(700 * scale), int((y + 24) * scale)),
            radius=int(12 * scale),
            fill=(203, 213, 225, 255),
        )

    # Shield/check badge.
    shield = [
        (int(512 * scale), int(604 * scale)),
        (int(648 * scale), int(658 * scale)),
        (int(624 * scale), int(782 * scale)),
        (int(512 * scale), int(846 * scale)),
        (int(400 * scale), int(782 * scale)),
        (int(376 * scale), int(658 * scale)),
    ]
    draw.polygon(shield, fill=TEAL)
    draw.line(
        [
            (int(452 * scale), int(714 * scale)),
            (int(500 * scale), int(762 * scale)),
            (int(588 * scale), int(672 * scale)),
        ],
        fill=WHITE,
        width=max(8, int(26 * scale)),
        joint="curve",
    )

    # Monogram.
    draw_centered(draw, (int(512 * scale), int(296 * scale)), "PO", BLUE, font(int(144 * scale), bold=True))
    return img


def icon() -> Image.Image:
    size = 1024
    img = gradient(size)
    draw = ImageDraw.Draw(img)
    draw.ellipse((620, -120, 1110, 370), fill=(20, 184, 166, 72))
    draw.ellipse((-180, 660, 360, 1200), fill=(37, 99, 235, 95))
    img.alpha_composite(logo_mark(size))
    mask = rounded_mask(size, 220)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, mask=mask)
    return out


def adaptive_icon() -> Image.Image:
    img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mark = logo_mark(850, with_shadow=False)
    img.alpha_composite(mark, (87, 87))
    return img


def splash_icon() -> Image.Image:
    img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    mark = logo_mark(238, with_shadow=False)
    img.alpha_composite(mark, (137, 54))
    draw_centered(draw, (256, 346), "PolicyOffice", WHITE, font(46, bold=True))
    draw_centered(draw, (256, 396), "Insurance agent workspace", MUTED, font(20))
    return img


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    icon().save(ASSETS / "icon.png")
    adaptive_icon().save(ASSETS / "adaptive-icon.png")
    splash_icon().save(ASSETS / "splash-icon.png")
    print("Generated PolicyOffice assets:")
    for name in ["icon.png", "adaptive-icon.png", "splash-icon.png"]:
        print(f"- {ASSETS / name}")


if __name__ == "__main__":
    main()
