#!/usr/bin/env python3
"""Unit tests for branche field-skip + NEXT-tag logic (no LLM calls).

Covers regressions reported in production:
- zonnepanelen plat dak → orientatie must be skipped (casing / whitespace variants too)
- zonnepanelen plat dak → dakmateriaal NEXT tag differentiates to _plat / _schuin
- dakdekker plat/schuin dak → huidig_dakmateriaal NEXT tag differentiates similarly

Run:
    cd lead-automation
    source venv/bin/activate
    python test_branches_logic.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from branches import get_branche
from branches.base import get_effective_missing_fields
from llm.reply import _determine_next_tag


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        print(f"FAIL: {msg}")
        sys.exit(1)
    print(f"ok   {msg}")


def test_plat_dak_skips_orientatie() -> None:
    config = get_branche("zonnepanelen")
    data = {"daktype": "plat"}
    missing = get_effective_missing_fields(config, data, "zonnepanelen")
    _assert("orientatie" not in missing, "plat dak → orientatie removed from missing")


def test_plat_dak_variants_skip_orientatie() -> None:
    config = get_branche("zonnepanelen")
    for variant in ["Plat", "PLAT", " plat ", "plat dak"]:
        data = {"daktype": variant}
        missing = get_effective_missing_fields(config, data, "zonnepanelen")
        _assert("orientatie" not in missing, f"daktype={variant!r} → orientatie skipped")


def test_schuin_dak_keeps_orientatie() -> None:
    config = get_branche("zonnepanelen")
    data = {"daktype": "schuin"}
    missing = get_effective_missing_fields(config, data, "zonnepanelen")
    _assert("orientatie" in missing, "schuin dak → orientatie still required")


def test_next_tag_dakmateriaal_plat() -> None:
    identity = {"naam": "Mark"}
    data = {"daktype": "plat", "jaarverbruik": "4000"}
    tag = _determine_next_tag("zonnepanelen", identity, data, {}, history=[])
    _assert(tag == "dakmateriaal_plat", f"plat + missing dakmateriaal → NEXT=dakmateriaal_plat (got {tag})")


def test_next_tag_dakmateriaal_schuin() -> None:
    identity = {"naam": "Mark"}
    data = {"daktype": "schuin", "jaarverbruik": "4000"}
    tag = _determine_next_tag("zonnepanelen", identity, data, {}, history=[])
    _assert(tag == "dakmateriaal_schuin", f"schuin + missing dakmateriaal → NEXT=dakmateriaal_schuin (got {tag})")


def test_plat_full_flow_never_yields_orientatie() -> None:
    identity = {"naam": "Mark"}
    data = {
        "daktype": "plat",
        "dakmateriaal": "dakbedekking",
        "dakoppervlakte": "80",
        "schaduw": "geen",
        "aansluiting": "1-fase",
    }
    tag = _determine_next_tag("zonnepanelen", identity, data, {}, history=[])
    _assert(tag != "orientatie", f"plat dak with other fields set → NEXT is not orientatie (got {tag})")


def test_dakdekker_next_tag_huidig_dakmateriaal_plat() -> None:
    identity = {"naam": "Peter"}
    data = {"type_werk": "vervangen", "daktype": "plat"}
    tag = _determine_next_tag("dakdekker", identity, data, {}, history=[])
    _assert(tag == "huidig_dakmateriaal_plat", f"dakdekker plat → NEXT=huidig_dakmateriaal_plat (got {tag})")


def test_dakdekker_next_tag_huidig_dakmateriaal_schuin() -> None:
    identity = {"naam": "Peter"}
    data = {"type_werk": "vervangen", "daktype": "schuin"}
    tag = _determine_next_tag("dakdekker", identity, data, {}, history=[])
    _assert(tag == "huidig_dakmateriaal_schuin", f"dakdekker schuin → NEXT=huidig_dakmateriaal_schuin (got {tag})")


def test_dakdekker_variants() -> None:
    identity = {"naam": "Peter"}
    for variant, expected in [("Plat", "huidig_dakmateriaal_plat"), ("plat dak", "huidig_dakmateriaal_plat"),
                              ("SCHUIN", "huidig_dakmateriaal_schuin"), (" schuin ", "huidig_dakmateriaal_schuin")]:
        data = {"type_werk": "vervangen", "daktype": variant}
        tag = _determine_next_tag("dakdekker", identity, data, {}, history=[])
        _assert(tag == expected, f"dakdekker daktype={variant!r} → NEXT={expected} (got {tag})")


if __name__ == "__main__":
    test_plat_dak_skips_orientatie()
    test_plat_dak_variants_skip_orientatie()
    test_schuin_dak_keeps_orientatie()
    test_next_tag_dakmateriaal_plat()
    test_next_tag_dakmateriaal_schuin()
    test_plat_full_flow_never_yields_orientatie()
    test_dakdekker_next_tag_huidig_dakmateriaal_plat()
    test_dakdekker_next_tag_huidig_dakmateriaal_schuin()
    test_dakdekker_variants()
    print("\nAll branche logic tests passed.")
