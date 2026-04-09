"""Personalized demo configuration — De Designmaker.

4 dienst-categorieën, elk met eigen velden die verzameld moeten worden.
"""

# De 4 diensten
DIENSTEN = ["carwrapping", "keuken_interieur", "binnen_reclame", "signing"]

# Velden per dienst (in volgorde waarin ze gevraagd worden)
FIELDS_PER_DIENST: dict[str, list[str]] = {
    "carwrapping": ["voertuig", "wrap_type", "kleur_afwerking", "huidige_kleur"],
    "keuken_interieur": ["wat_wrappen", "aantal_vlakken", "gewenste_look", "huidige_staat"],
    "binnen_reclame": ["type_reclame", "locatie_pand", "afmetingen", "huisstijl"],
    "signing": ["voertuig_type", "aantal", "ontwerp_scope", "huisstijl"],
}

# Alle unieke veldnamen (voor extractie LLM)
ALL_FIELDS = sorted(set(f for fields in FIELDS_PER_DIENST.values() for f in fields))

# Limits
MAX_PHOTOS = 6
PHOTO_WAIT_MS = 30_000
RATE_LIMIT_MAX = 30
