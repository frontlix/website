"""Pytest session-fixture: BRANCHES start leeg na Pakket 1-migratie. Zonder
expliciete hydrate is `get_branche('zonnepanelen')` None tijdens tests.
Deze fixture roept hydrate_all() één keer per sessie aan (default CONFIG_SOURCE=json).
"""
from __future__ import annotations

import sys
from pathlib import Path

# Sommige tests draaien ook als standalone script vanuit andere CWDs;
# zorg dat de lead-automation root op sys.path staat.
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pytest

from branches.loader import hydrate_all


@pytest.fixture(scope="session", autouse=True)
def _hydrate_branches() -> None:
    hydrate_all()
