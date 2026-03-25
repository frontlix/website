"""
Bewerk Frontlix profielfoto's — v2
Schone lichte achtergrond, zachte randen, geen donkere artefacten.
"""

from PIL import Image, ImageFilter, ImageEnhance
from rembg import remove
import numpy as np
import io
import os

INPUT_DIR = "public/images"
TARGET_SIZE = 800

photos = [
    "profiel foto christiaan.png",
    "profiel foto georg.png",
]

# Achtergrondkleur: zacht lichtgrijs, past bij de witte kaarten
BG_COLOR = (243, 244, 246)  # #F3F4F6 — heel licht grijs


def process_photo(filename):
    input_path = os.path.join(INPUT_DIR, filename)
    print(f"\n  Verwerken: {filename}")

    # 1. Lees origineel
    with open(input_path, "rb") as f:
        input_data = f.read()

    # 2. Verwijder achtergrond met hogere kwaliteit
    print("    - Achtergrond verwijderen...")
    output_data = remove(
        input_data,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )
    subject = Image.open(io.BytesIO(output_data)).convert("RGBA")

    # 3. Zachte randen: blur de alpha channel licht voor smooth edges
    print("    - Randen verzachten...")
    r, g, b, a = subject.split()
    # Lichte blur op alpha voor zachte overgang
    a_smooth = a.filter(ImageFilter.GaussianBlur(radius=1.5))
    subject = Image.merge("RGBA", [r, g, b, a_smooth])

    # 4. Vind het onderwerp en crop vierkant
    alpha = subject.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        print("    FOUT: Geen onderwerp gevonden!")
        return

    left, top, right, bottom = bbox
    subj_w = right - left
    subj_h = bottom - top
    subj_cx = left + subj_w // 2

    # Vierkante crop met padding
    padding = int(max(subj_w, subj_h) * 0.15)
    crop_size = max(subj_w, subj_h) + padding * 2

    crop_left = subj_cx - crop_size // 2
    crop_top = top - padding
    crop_right = crop_left + crop_size
    crop_bottom = crop_top + crop_size

    # Pas aan als crop buiten afbeelding valt
    if crop_left < 0:
        shift = -crop_left
        crop_left += shift
        crop_right += shift
    if crop_top < 0:
        shift = -crop_top
        crop_top += shift
        crop_bottom += shift
    if crop_right > subject.width:
        shift = crop_right - subject.width
        crop_left -= shift
        crop_right -= shift
    if crop_bottom > subject.height:
        shift = crop_bottom - subject.height
        crop_top -= shift
        crop_bottom -= shift

    # Maak een nieuw canvas op de juiste grootte
    canvas = Image.new("RGBA", (crop_size, crop_size), (0, 0, 0, 0))
    # Plak het onderwerp op het canvas
    paste_x = max(0, -crop_left)
    paste_y = max(0, -crop_top)
    crop_left = max(0, crop_left)
    crop_top = max(0, crop_top)
    crop_right = min(subject.width, crop_right)
    crop_bottom = min(subject.height, crop_bottom)

    cropped = subject.crop((crop_left, crop_top, crop_right, crop_bottom))
    canvas.paste(cropped, (paste_x, paste_y))
    canvas = canvas.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)

    # 5. Maak schone lichte achtergrond
    print("    - Lichte achtergrond toepassen...")
    bg = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (*BG_COLOR, 255))

    # 6. Composiet
    result = Image.alpha_composite(bg, canvas)
    result_rgb = result.convert("RGB")

    # 7. Subtiele kleurcorrectie — GEEN grayscale, alleen licht koeler
    print("    - Kleurcorrectie (koeler, geen zwart-wit)...")
    r_ch, g_ch, b_ch = result_rgb.split()
    r_arr = np.array(r_ch, dtype=np.float32)
    g_arr = np.array(g_ch, dtype=np.float32)
    b_arr = np.array(b_ch, dtype=np.float32)

    # Heel subtiel koeler: rood -2%, blauw +1%
    r_arr = np.clip(r_arr * 0.98, 0, 255)
    b_arr = np.clip(b_arr * 1.01, 0, 255)

    result_rgb = Image.merge("RGB", [
        Image.fromarray(r_arr.astype(np.uint8)),
        Image.fromarray(g_arr.astype(np.uint8)),
        Image.fromarray(b_arr.astype(np.uint8)),
    ])

    # 8. Licht contrast + scherpte
    print("    - Contrast & scherpte...")
    result_rgb = ImageEnhance.Contrast(result_rgb).enhance(1.08)
    result_rgb = ImageEnhance.Sharpness(result_rgb).enhance(1.2)

    # 9. Opslaan
    output_path = os.path.join(INPUT_DIR, filename)
    result_rgb.save(output_path, "PNG")
    print(f"    - Opgeslagen: {output_path} ({TARGET_SIZE}x{TARGET_SIZE})")


if __name__ == "__main__":
    print("Frontlix profielfoto bewerking v2")
    print("=" * 40)
    for photo in photos:
        process_photo(photo)
    print("\nKlaar!")
