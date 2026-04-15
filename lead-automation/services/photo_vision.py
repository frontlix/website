"""Photo analysis via GPT-4o vision. Branche-specific prompts."""
from __future__ import annotations

from services.openai_client import get_openai

PROMPTS: dict[str, str] = {
    "zonnepanelen": (
        "You are a solar panel installer. Look at this photo in Dutch and give a 2-3 sentence factual assessment. "
        "If it is a ROOF photo: report roof type (pitched/flat), estimated material, orientation if visible, obstacles "
        "(chimney, skylight, trees causing shade), and overall condition. "
        "If it is a METERKAST / fuse box / electrical panel photo: count the large main switches (hoofdschakelaars) at the top. "
        "1 large switch = 1-fase aansluiting, 3 large switches = 3-fase aansluiting. State the finding clearly, e.g. "
        "\"Ik zie 3 grote hoofdschakelaars, dus je hebt een 3-fase aansluiting.\" "
        "No sales talk, only facts."
    ),
    "dakdekker": (
        "You are an experienced roofer. Look at this photo of a roof and give a 2-3 sentence factual assessment in Dutch: "
        "roof type (flat/pitched), material (dakpannen, bitumen, EPDM, leisteen, riet, grind), visible damage or wear (cracks, "
        "leaks, missing tiles, sagging). If the full roof outline is visible, give a rough m² estimate by comparing to "
        "reference elements (standard dakpan ≈ 33×41cm, dormer ≈ 1-2m wide). Format m² estimate as \"ruwe schatting: ± X m²\". "
        "No sales talk, only what a roofer would see on first inspection."
    ),
    "schoonmaak": (
        "You are a cleaning professional. Look at this photo of a space and give a 2-3 sentence factual assessment in Dutch: "
        "type of space (office/home/hospitality/retail), visible surfaces (floor, windows, sanitary), state of soiling and any "
        "special concerns (e.g. stubborn dirt, high-reach work needed, glass surfaces). If the photo shows a full room, give a "
        "rough m² estimate (single desk workspace ≈ 6-10 m², living room ≈ 20-30 m², small café ≈ 40-80 m²). Format m² estimate "
        "as \"ruwe schatting: ± X m²\". No sales talk."
    ),
}


async def analyze_photo(image_url: str, branche_id: str) -> str:
    """Analyze a customer photo with GPT-4o vision. Returns a short Dutch text analysis."""
    prompt = PROMPTS.get(branche_id)
    if not prompt:
        return "(Foto ontvangen — geen analyse beschikbaar.)"

    try:
        response = get_openai().chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url, "detail": "low"}},
                    ],
                },
            ],
        )
        text = (response.choices[0].message.content or "").strip()
        return text or "(Foto ontvangen — kon geen analyse maken.)"
    except Exception as e:
        print(f"Photo vision error: {e}")
        return "(Foto ontvangen — vision analyse mislukt.)"
