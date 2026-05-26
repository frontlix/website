#!/usr/bin/env python3
"""Unit tests for water_reminder_cron pure helpers (no network calls).

Run:
    cd lead-automation
    source venv/bin/activate
    pytest test_water_reminder_cron.py -v
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from services.water_reminder_cron import (
    ISTANBUL_TZ,
    JOKES,
    format_istanbul_time,
    should_trigger,
    slot_index_for,
)


def _ist(year, month, day, hour, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=ISTANBUL_TZ)


class TestSlotIndexFor:
    def test_first_slot_is_28may_10am(self):
        assert slot_index_for(_ist(2026, 5, 28, 10)) == 1

    def test_second_slot_is_28may_12pm(self):
        assert slot_index_for(_ist(2026, 5, 28, 12)) == 2

    def test_last_slot_of_day1_is_28may_20pm(self):
        assert slot_index_for(_ist(2026, 5, 28, 20)) == 6

    def test_first_slot_of_day2_is_29may_10am(self):
        assert slot_index_for(_ist(2026, 5, 29, 10)) == 7

    def test_final_slot_is_31may_20pm(self):
        assert slot_index_for(_ist(2026, 5, 31, 20)) == 24

    def test_returns_none_for_date_before_range(self):
        assert slot_index_for(_ist(2026, 5, 27, 10)) is None

    def test_returns_none_for_date_after_range(self):
        assert slot_index_for(_ist(2026, 6, 1, 10)) is None

    def test_returns_none_for_invalid_hour(self):
        assert slot_index_for(_ist(2026, 5, 28, 11)) is None
        assert slot_index_for(_ist(2026, 5, 28, 9)) is None
        assert slot_index_for(_ist(2026, 5, 28, 21)) is None

    def test_raises_on_naive_datetime(self):
        with pytest.raises(ValueError, match="tz-aware"):
            slot_index_for(datetime(2026, 5, 28, 10))


class TestShouldTrigger:
    def test_true_on_valid_slot_minute_zero(self):
        assert should_trigger(_ist(2026, 5, 28, 10, 0)) is True

    def test_false_on_valid_slot_nonzero_minute(self):
        assert should_trigger(_ist(2026, 5, 28, 10, 1)) is False
        assert should_trigger(_ist(2026, 5, 28, 10, 59)) is False

    def test_false_off_schedule(self):
        assert should_trigger(_ist(2026, 5, 28, 11, 0)) is False
        assert should_trigger(_ist(2026, 5, 27, 10, 0)) is False


class TestFormatIstanbulTime:
    def test_morning_slot(self):
        assert format_istanbul_time(_ist(2026, 5, 28, 10)) == "10:00"

    def test_evening_slot(self):
        assert format_istanbul_time(_ist(2026, 5, 31, 20)) == "20:00"


class TestJokesList:
    def test_has_exactly_24_jokes(self):
        assert len(JOKES) == 24

    def test_jokes_are_unique(self):
        assert len(set(JOKES)) == 24, "all jokes must be unique"

    def test_jokes_have_no_trailing_period(self):
        # Template body adds ". Tijd om water te drinken 💧", so jokes must not end with "."
        for i, joke in enumerate(JOKES, 1):
            assert not joke.endswith("."), f"Joke #{i} ends with period: {joke!r}"


class TestCheckAndSend:
    """Tests for _check_and_send idempotency. We patch send_template to count calls."""

    @pytest.fixture(autouse=True)
    def reset_sent_indices(self):
        from services.water_reminder_cron import _sent_indices
        _sent_indices.clear()
        yield
        _sent_indices.clear()

    @pytest.mark.asyncio
    async def test_marks_slot_as_sent_after_call(self, monkeypatch):
        from services import water_reminder_cron

        calls = []

        async def fake_send_template(phone, template_name, parameters):
            calls.append((phone, template_name, parameters))

        monkeypatch.setattr(water_reminder_cron, "send_template", fake_send_template)

        now = _ist(2026, 5, 28, 10, 0)
        await water_reminder_cron._check_and_send(now)

        assert 1 in water_reminder_cron._sent_indices
        assert len(calls) == 2  # two recipients

    @pytest.mark.asyncio
    async def test_does_not_resend_same_slot(self, monkeypatch):
        from services import water_reminder_cron

        calls = []

        async def fake_send_template(phone, template_name, parameters):
            calls.append((phone, template_name, parameters))

        monkeypatch.setattr(water_reminder_cron, "send_template", fake_send_template)

        now = _ist(2026, 5, 28, 10, 0)
        await water_reminder_cron._check_and_send(now)
        await water_reminder_cron._check_and_send(now)

        assert len(calls) == 2  # still just two, not four

    @pytest.mark.asyncio
    async def test_does_nothing_off_schedule(self, monkeypatch):
        from services import water_reminder_cron

        calls = []

        async def fake_send_template(phone, template_name, parameters):
            calls.append((phone, template_name, parameters))

        monkeypatch.setattr(water_reminder_cron, "send_template", fake_send_template)

        now = _ist(2026, 5, 27, 10, 0)  # day before range
        await water_reminder_cron._check_and_send(now)

        assert len(calls) == 0
        assert len(water_reminder_cron._sent_indices) == 0
